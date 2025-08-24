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
  photoUrl?: string;
  location?: { latitude: number; longitude: number };
}

interface TimeTrackingContextType {
  isWorking: boolean;
  currentSession: WorkSession | null;
  elapsedSeconds: number;
  startWork: (projectId: string, projectName: string, taskId: string, taskName: string, photo?: File, location?: GeolocationPosition) => Promise<void>;
  stopWork: () => Promise<void>;
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
  const { currentUser, ownerUid, employeeData } = useAuth();
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
    photo?: File,
    location?: GeolocationPosition
  ) => {
    if (!currentUser) throw new Error('User not authenticated');
    if (!ownerUid) throw new Error('Owner UID is not defined for this employee.');
    
    try {
      let photoUrl: string | undefined;
      let locationData: { latitude: number; longitude: number } | undefined;

      // Upload photo if provided
      if (photo) {
        const photoRef = ref(storage, `tasks/${taskId}/start_${Date.now()}`);
        await uploadBytes(photoRef, photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      // Process location if provided
      if (location) {
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      // Update task status in Firebase
      const updateData: any = {
        status: 'in_progress',
        startedAt: new Date(),
      };
      
      // Only add optional fields if they have values
      if (photoUrl) {
        updateData.startPhotoUrl = photoUrl;
      }
      if (locationData) {
        updateData.startLocation = locationData;
      }
      
      await updateTask(ownerUid, taskId, updateData);

      const startTime = new Date();
      const session: WorkSession = {
        taskId,
        taskName,
        projectId,
        projectName,
        startTime,
        photoUrl,
        location: locationData,
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

  const stopWork = async () => {
    console.log('stopWork called. Checking conditions...');
    console.log('currentUser:', currentUser);
    console.log('currentSession:', currentSession);
    console.log('ownerUid:', ownerUid);
    console.log('employeeData:', employeeData);

    if (!currentUser || !currentSession || !ownerUid || !employeeData) {
        console.warn('stopWork aborted due to missing data.');
        return;
    }

    try {
      const hoursWorked = elapsedSeconds / 3600; // Convert seconds to hours

      // Save timesheet entry to the owner's subcollection
      await addTimesheetEntry(ownerUid, {
        employeeId: employeeData.id,
        projectId: currentSession.projectId,
        taskId: currentSession.taskId,
        date: currentSession.startTime.toISOString().split('T')[0],
        hours: Math.round(hoursWorked * 100) / 100,
        description: `Работа над задачей: ${currentSession.taskName}`,
        rate: 0, // Placeholder for rate
        status: 'submitted'
      });

      // Update task - mark as completed if needed
      // We can add more logic here later if needed

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
        pauseWork,
        resumeWork,
        isPaused,
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
};
