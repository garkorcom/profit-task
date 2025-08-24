import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { updateTask } from '../api/taskApi';
import { addTimesheetEntry } from '../api/employeeApi';
import { storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface WorkSession {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  startTime: Date;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  startLocation?: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
}

interface TimeTrackingContextType {
  isWorking: boolean;
  currentSession: WorkSession | null;
  elapsedSeconds: number;
  startWork: (projectId: string, projectName: string, taskId: string, taskName: string, startPhoto?: File, location?: GeolocationPosition) => Promise<void>;
  stopWork: () => Promise<void>;
  stopWorkWithData: (endPhoto: File, comment?: string, location?: GeolocationPosition) => Promise<void>;
  pauseWork: () => void;
  resumeWork: () => void;
  isPaused: boolean;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within TimeTrackingProvider');
  }
  return context;
};

export const TimeTrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isWorking, setIsWorking] = useState(false);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('workSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const startTime = new Date(session.startTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // If session is less than 24 hours old, restore it
        if (hoursDiff < 24) {
          setCurrentSession({
            ...session,
            startTime: startTime
          });
          setIsWorking(true);
          
          // Calculate elapsed time
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        } else {
          // Clear old session
          localStorage.removeItem('workSession');
        }
      } catch (error) {
        console.error('Error restoring work session:', error);
        localStorage.removeItem('workSession');
      }
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isWorking || !currentSession || isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorking, currentSession, isPaused]);

  const startWork = async (
    projectId: string,
    projectName: string,
    taskId: string,
    taskName: string,
    startPhoto?: File,
    location?: GeolocationPosition
  ) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
      // Фото ДО — обязательно
      if (!startPhoto) {
        throw new Error('Требуется фото ДО начала работ');
      }

      const photoRef = ref(storage, `tasks/${taskId}/start_${Date.now()}`);
      await uploadBytes(photoRef, startPhoto);
      const startPhotoUrl = await getDownloadURL(photoRef);

      let startLocation: { latitude: number; longitude: number } | undefined;

      // Process location if provided
      if (location) {
        startLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      // Update task status in Firebase
      const updateData: any = {
        status: 'in_progress',
        startedAt: new Date(),
      };
      updateData.startPhotoUrl = startPhotoUrl;
      if (startLocation) updateData.startLocation = startLocation;
      
      await updateTask(currentUser.uid, taskId, updateData);

      const startTime = new Date();
      const session: WorkSession = {
        taskId,
        taskName,
        projectId,
        projectName,
        startTime,
        startPhotoUrl,
        startLocation,
      };

      // Save to state and localStorage
      setCurrentSession(session);
      setIsWorking(true);
      setElapsedSeconds(0);
      setIsPaused(false);
      
      localStorage.setItem('workSession', JSON.stringify({
        ...session,
        startTime: startTime.toISOString(),
      }));

      console.log('Work started:', session);
    } catch (error) {
      console.error('Failed to start work:', error);
      throw error;
    }
  };

  const stopWorkWithData = async (endPhoto: File, comment?: string, location?: GeolocationPosition) => {
    if (!currentUser || !currentSession) {
      console.warn('stopWork aborted due to missing data.');
      return;
    }

    try {
      // Фото ПОСЛЕ — обязательно
      if (!endPhoto) {
        throw new Error('Требуется фото ПОСЛЕ завершения работ');
      }

      const endPhotoRef = ref(storage, `tasks/${currentSession.taskId}/end_${Date.now()}`);
      await uploadBytes(endPhotoRef, endPhoto);
      const endPhotoUrl = await getDownloadURL(endPhotoRef);

      let endLocation: { latitude: number; longitude: number } | undefined;
      if (location) {
        endLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      const hoursWorked = elapsedSeconds / 3600; // Convert seconds to hours

      // Save timesheet entry to the current user's subcollection
      await addTimesheetEntry(currentUser.uid, {
        employeeId: currentUser.uid,
        projectId: currentSession.projectId,
        taskId: currentSession.taskId,
        date: currentSession.startTime,
        hours: Math.round(hoursWorked * 100) / 100,
        description: `Работа над задачей: ${currentSession.taskName}`,
        startPhotoUrl: currentSession.startPhotoUrl,
        endPhotoUrl,
        startLocation: currentSession.startLocation,
        endLocation,
        comment,
        rate: 0,
        status: 'submitted'
      });

      // Обновляем задачу (финиш)
      await updateTask(currentUser.uid, currentSession.taskId, {
        status: 'in_review',
        finishedAt: new Date(),
        endPhotoUrl,
        ...(endLocation ? { endLocation } : {}),
      });

      // Clear session
      setCurrentSession(null);
      setIsWorking(false);
      setElapsedSeconds(0);
      setIsPaused(false);
      localStorage.removeItem('workSession');

      console.log('Work stopped, hours worked:', hoursWorked);
    } catch (error) {
      console.error('Failed to stop work:', error);
      throw error;
    }
  };

  const stopWork = async () => {
    throw new Error('Для завершения работы требуется фото ПОСЛЕ. Пожалуйста, используйте интерфейс, чтобы добавить фото.');
  };

  const pauseWork = () => {
    setIsPaused(true);
  };

  const resumeWork = () => {
    setIsPaused(false);
  };

  return (
    <TimeTrackingContext.Provider
      value={{
        isWorking,
        currentSession,
        elapsedSeconds,
        startWork,
        stopWork,
        stopWorkWithData,
        pauseWork,
        resumeWork,
        isPaused,
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
};
