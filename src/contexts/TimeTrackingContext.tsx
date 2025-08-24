import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  changeTaskStatus, 
  submitTaskForReview,
  TaskStatus,
  getTasksStream,
  Task
} from '../api/taskApi';
import { 
  createTimeEntry, 
  updateTimeEntry, 
  completeTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  uploadTimeEntryPhoto,
  getTimeEntriesByTaskStream,
  TimeEntry,
  TimeEntryStatus
} from '../api/timeEntryApi';

interface TimeTrackingContextType {
  // Текущее состояние
  isWorking: boolean;
  isPaused: boolean;
  currentEntry: TimeEntry | null;
  currentTask: Task | null;
  elapsedSeconds: number;
  
  // Управление сессиями работы
  startWork: (
    taskId: string,
    startPhoto?: File,
    location?: GeolocationPosition
  ) => Promise<void>;
  
  stopWork: (
    endPhoto?: File,
    comment?: string,
    location?: GeolocationPosition
  ) => Promise<void>;
  
  pauseWork: (reason?: string) => Promise<void>;
  resumeWork: () => Promise<void>;
  
  // Получение данных
  getTaskTimeEntries: (taskId: string) => Promise<TimeEntry[]>;
  getTotalTaskDuration: (taskId: string) => number;
  
  // Проверки
  canStartWork: (task: Task) => boolean;
  requiresPhoto: (task: Task) => boolean;
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
  const [isPaused, setIsPaused] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [taskEntries, setTaskEntries] = useState<Record<string, TimeEntry[]>>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Загрузка всех задач пользователя
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = getTasksStream(currentUser.uid, (tasks) => {
      setAllTasks(tasks);
      
      // Проверяем, есть ли активная задача
      const activeTask = tasks.find(t => t.status === 'in_progress');
      if (activeTask) {
        setCurrentTask(activeTask);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Восстановление сессии из localStorage
  useEffect(() => {
    const savedEntry = localStorage.getItem('currentTimeEntry');
    const savedTaskId = localStorage.getItem('currentTaskId');
    
    if (savedEntry && savedTaskId && currentUser) {
      try {
        const entry = JSON.parse(savedEntry);
        const task = allTasks.find(t => t.id === savedTaskId);
        
        if (task && task.status === 'in_progress') {
          setCurrentEntry(entry);
          setCurrentTask(task);
          setIsWorking(true);
          setIsPaused(entry.status === 'paused');
          
          // Рассчитываем прошедшее время
          const startTime = new Date(entry.startTime);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        } else {
          // Очищаем устаревшую сессию
          localStorage.removeItem('currentTimeEntry');
          localStorage.removeItem('currentTaskId');
        }
      } catch (error) {
        console.error('Error restoring time entry:', error);
        localStorage.removeItem('currentTimeEntry');
        localStorage.removeItem('currentTaskId');
      }
    }
  }, [currentUser, allTasks]);

  // Таймер
  useEffect(() => {
    if (!isWorking || !currentEntry || isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(currentEntry.startTime);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorking, currentEntry, isPaused]);

  // Загрузка TimeEntries для текущей задачи
  useEffect(() => {
    if (!currentUser || !currentTask) return;
    
    const unsubscribe = getTimeEntriesByTaskStream(
      currentUser.uid,
      currentTask.id,
      (entries) => {
        setTaskEntries(prev => ({
          ...prev,
          [currentTask.id]: entries
        }));
      }
    );
    
    return () => unsubscribe();
  }, [currentUser, currentTask]);

  const canStartWork = (task: Task): boolean => {
    // Проверяем, можно ли начать работу над задачей
    const validStatuses: TaskStatus[] = ['assigned', 'in_progress', 'rework'];
    return validStatuses.includes(task.status as TaskStatus);
  };

  const requiresPhoto = (task: Task): boolean => {
    return task.requirePhoto === true;
  };

  const startWork = async (
    taskId: string,
    startPhoto?: File,
    location?: GeolocationPosition
  ) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Находим задачу
    const task = allTasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    // Проверяем, можно ли начать работу
    if (!canStartWork(task)) {
      throw new Error(`Cannot start work on task with status: ${task.status}`);
    }
    
    // Проверяем обязательность фото
    if (requiresPhoto(task) && !startPhoto) {
      throw new Error('Photo is required for this task');
    }
    
    try {
      // Создаем новую сессию работы
      const entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        taskId: task.id,
        taskName: task.task,
        projectId: task.projectId || '',
        projectName: task.projectName || '',
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || '',
        startTime: new Date(),
        status: 'active' as TimeEntryStatus,
        ...(location && {
          startLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: new Date(location.timestamp)
          }
        })
      };
      
      // Создаем запись в БД
      const entryId = await createTimeEntry(currentUser.uid, entry);
      
      // Загружаем фото, если есть
      let startPhotoUrl: string | undefined;
      if (startPhoto) {
        startPhotoUrl = await uploadTimeEntryPhoto(
          currentUser.uid,
          entryId,
          startPhoto,
          'start'
        );
        
        // Обновляем запись с URL фото
        await updateTimeEntry(currentUser.uid, entryId, { startPhotoUrl });
      }
      
      // Обновляем статус задачи
      if (task.status !== 'in_progress') {
        await changeTaskStatus(currentUser.uid, taskId, 'in_progress');
      }
      
      // Обновляем локальное состояние
      const fullEntry: TimeEntry = {
        ...entry,
        id: entryId,
        startPhotoUrl
      };
      
      setCurrentEntry(fullEntry);
      setCurrentTask(task);
      setIsWorking(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      
      // Сохраняем в localStorage
      localStorage.setItem('currentTimeEntry', JSON.stringify(fullEntry));
      localStorage.setItem('currentTaskId', taskId);
      
    } catch (error) {
      console.error('Error starting work:', error);
      throw error;
    }
  };

  const stopWork = async (
    endPhoto?: File,
    comment?: string,
    location?: GeolocationPosition
  ) => {
    if (!currentUser || !currentEntry || !currentTask) {
      throw new Error('No active work session');
    }
    
    // Проверяем обязательность фото
    if (requiresPhoto(currentTask) && !endPhoto) {
      throw new Error('End photo is required for this task');
    }
    
    try {
      // Загружаем фото, если есть
      let endPhotoUrl: string | undefined;
      if (endPhoto && currentEntry.id) {
        endPhotoUrl = await uploadTimeEntryPhoto(
          currentUser.uid,
          currentEntry.id,
          endPhoto,
          'end'
        );
      }
      
      // Завершаем сессию работы
      if (currentEntry.id) {
        await completeTimeEntry(
          currentUser.uid,
          currentEntry.id,
          endPhotoUrl,
          comment,
          location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: new Date(location.timestamp)
          } : undefined
        );
      }
      
      // Отправляем задачу на проверку
      await submitTaskForReview(currentUser.uid, currentTask.id);
      
      // Очищаем состояние
      setCurrentEntry(null);
      setCurrentTask(null);
      setIsWorking(false);
      setIsPaused(false);
      setElapsedSeconds(0);
      
      // Очищаем localStorage
      localStorage.removeItem('currentTimeEntry');
      localStorage.removeItem('currentTaskId');
      
    } catch (error) {
      console.error('Error stopping work:', error);
      throw error;
    }
  };

  const pauseWork = async (reason?: string) => {
    if (!currentUser || !currentEntry || !currentEntry.id) {
      throw new Error('No active work session');
    }
    
    try {
      await pauseTimeEntry(currentUser.uid, currentEntry.id, reason);
      setIsPaused(true);
      
      // Обновляем сохраненную сессию
      const updatedEntry = { ...currentEntry, status: 'paused' as TimeEntryStatus };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      
    } catch (error) {
      console.error('Error pausing work:', error);
      throw error;
    }
  };

  const resumeWork = async () => {
    if (!currentUser || !currentEntry || !currentEntry.id) {
      throw new Error('No paused work session');
    }
    
    try {
      await resumeTimeEntry(currentUser.uid, currentEntry.id);
      setIsPaused(false);
      
      // Обновляем сохраненную сессию
      const updatedEntry = { ...currentEntry, status: 'active' as TimeEntryStatus };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      
    } catch (error) {
      console.error('Error resuming work:', error);
      throw error;
    }
  };

  const getTaskTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
    return taskEntries[taskId] || [];
  };

  const getTotalTaskDuration = (taskId: string): number => {
    const entries = taskEntries[taskId] || [];
    return entries.reduce((total, entry) => {
      if (entry.duration && (entry.status === 'completed' || entry.status === 'approved')) {
        return total + entry.duration;
      }
      return total;
    }, 0);
  };

  const value: TimeTrackingContextType = {
    isWorking,
    isPaused,
    currentEntry,
    currentTask,
    elapsedSeconds,
    startWork,
    stopWork,
    pauseWork,
    resumeWork,
    getTaskTimeEntries,
    getTotalTaskDuration,
    canStartWork,
    requiresPhoto
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
};