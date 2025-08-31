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
  TimeEntry,
  TimeEntryStatus,
  getTimeEntriesByTaskStream,
  uploadTimeEntryPhoto // Возвращаем импорт
} from '../api/timeEntryApi';
import {
  pauseTimeEntryEnhanced,
  completeTimeEntryEnhanced,
} from '../api/timeEntryEnhanced';
import { deleteField, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Estimate, EstimateItem } from '../legacy/api/estimateApi';
import { Project } from '../api/projectApi';
import { db } from '../firebase/firebase';

interface TimeTrackingContextType {
  // Текущее состояние
  isWorking: boolean;
  isPaused: boolean;
  currentEntry: TimeEntry | null;
  currentSession: TimeEntry | null; // Для обратной совместимости
  currentTask: Task | null;
  elapsedSeconds: number;
  
  // Управление сессиями работы
  startWork: (payload: StartWorkPayload) => Promise<void>;
  
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

export interface StartWorkPayload {
  task?: Task;
  estimate?: Estimate;
  service?: EstimateItem;
  project: Project; // Проект теперь обязателен
  startPhoto?: File;
  location?: GeolocationPosition;
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
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Загрузка всех задач пользователя
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = getTasksStream(currentUser.uid, (tasks) => {
      setAllTasks(tasks);
      setTasksLoaded(true);
      console.log('✅ Задачи загружены:', tasks.length);
      
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
    const savedEntryId = localStorage.getItem('currentEntryId');
    
    console.log('🔄 Проверка сохраненной сессии:', { 
      hasSavedEntry: !!savedEntry, 
      savedTaskId, 
      savedEntryId,
      hasCurrentUser: !!currentUser,
      tasksLoaded
    });
    
    // Ждем загрузки задач перед восстановлением
    if (savedEntry && savedTaskId && currentUser && tasksLoaded) {
      try {
        const entry = JSON.parse(savedEntry);
        
        // Восстанавливаем ID если он не сохранился в entry
        if (!entry.id && savedEntryId) {
          entry.id = savedEntryId;
          console.log('📝 Восстановлен ID записи:', savedEntryId);
        }
        
        // Проверяем, является ли это виртуальной задачей для сметы
        const isEstimateTask = savedTaskId.startsWith('estimate-');
        
        if (isEstimateTask) {
          // Для виртуальной задачи просто восстанавливаем сессию
          console.log('📊 Восстанавливаем сессию учета времени по смете', entry);
          if (!entry.id) {
            console.error('⚠️ Восстановленная запись не имеет ID!');
            // Пытаемся восстановить ID из отдельного ключа
            if (savedEntryId) {
              entry.id = savedEntryId;
              console.log('✅ ID записи восстановлен из localStorage:', savedEntryId);
            } else {
              console.error('❌ Не удалось восстановить ID записи, очищаем сессию');
              localStorage.removeItem('currentTimeEntry');
              localStorage.removeItem('currentTaskId');
              localStorage.removeItem('currentEntryId');
              return;
            }
          }
          setCurrentEntry(entry);
          setCurrentTask({ id: savedTaskId, task: entry.taskName } as Task);
          setIsWorking(true);
          setIsPaused(entry.status === 'paused');
          
          // Рассчитываем прошедшее время
          const startTime = new Date(entry.startTime);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        } else {
          // Для реальной задачи проверяем ее статус
          const task = allTasks.find(t => t.id === savedTaskId);
          
          if (task && (task.status === 'in_progress' || task.status === 'assigned' || task.status === 'new')) {
            console.log('📋 Восстанавливаем сессию учета времени по задаче', entry);
            if (!entry.id) {
              console.error('⚠️ Восстановленная запись не имеет ID!');
            }
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
            console.warn('⚠️ Задача не найдена или завершена, очищаем сессию');
            localStorage.removeItem('currentTimeEntry');
            localStorage.removeItem('currentTaskId');
            localStorage.removeItem('currentEntryId');
          }
        }
      } catch (error) {
        console.error('Error restoring time entry:', error);
        localStorage.removeItem('currentTimeEntry');
        localStorage.removeItem('currentTaskId');
        localStorage.removeItem('currentEntryId');
      }
    }
  }, [currentUser, allTasks, tasksLoaded]);

  // Таймер с учетом пауз
  useEffect(() => {
    if (!isWorking || !currentEntry) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        const now = new Date();
        const startTime = new Date(currentEntry.startTime);
        
        // Получаем сохраненное время пауз из localStorage
        const savedPauseDuration = parseInt(localStorage.getItem('totalPauseDuration') || '0', 10);
        
        // Если сейчас на паузе, не обновляем счетчик
        if (currentEntry.status === 'paused') {
          return;
        }
        
        // Рассчитываем общее время
        const totalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        // Вычитаем время пауз для получения активного времени
        const activeSeconds = Math.max(0, totalSeconds - savedPauseDuration);
        setElapsedSeconds(activeSeconds);
      }
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
    const validStatuses: TaskStatus[] = ['new', 'assigned', 'in_progress', 'rework'];
    return validStatuses.includes(task.status as TaskStatus);
  };

  const requiresPhoto = (task: Task): boolean => {
    // На localhost временно отключаем обязательность фото из-за CORS
    if (window.location.hostname === 'localhost') {
      return false;
    }
    return task.requirePhoto === true;
  };

  const startWork = async (payload: StartWorkPayload) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const { task, estimate, service, project, startPhoto, location } = payload;

    // Определяем, что является основной "задачей" для учета времени
    const isEstimateWork = !task && !!estimate;
    const workTarget = task || service || estimate;
    if (!workTarget) {
      throw new Error('Необходимо указать задачу или смету для начала работы');
    }
    
    // ID для записи в TimeEntry. Для сметы это будет "виртуальный" ID.
    const taskId = task?.id || `estimate-${estimate?.id}-${service?.id || 'main'}`;
    const taskName = task?.task || service?.name || estimate?.name || 'Работа';

    try {
      // Создаем новую сессию работы
      const entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        taskId: taskId,
        taskName: taskName,
        projectId: project.id,
        projectName: project.name,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || '',
        startTime: new Date(),
        status: 'active' as TimeEntryStatus,
        ...(estimate && { estimateId: estimate.id, estimateName: estimate.name }),
        ...(service && { serviceId: service.id, serviceName: service.name }),
        ...(location && {
          startLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            ...(location.coords.accuracy && { accuracy: location.coords.accuracy }),
            timestamp: new Date(location.timestamp)
          }
        })
      };
      
      // Создаем запись в БД
      const entryId = await createTimeEntry(currentUser.uid, entry);
      console.log('✅ Запись времени создана с ID:', entryId);
      
      if (!entryId) {
        throw new Error('Failed to create time entry - no ID returned');
      }
      
      // Загружаем фото, если есть
      let startPhotoUrl: string | undefined;
      if (startPhoto) {
        try {
          console.log('📸 Пытаемся загрузить фото...');
          startPhotoUrl = await uploadTimeEntryPhoto(
            currentUser.uid,
            entryId,
            startPhoto,
            'start'
          );
          
          // Обновляем запись с URL фото
          if (startPhotoUrl && startPhotoUrl !== 'placeholder-photo-url') {
            await updateTimeEntry(currentUser.uid, entryId, { startPhotoUrl });
            console.log('✅ Фото успешно загружено');
          }
        } catch (photoError) {
          console.error('Failed to upload start photo:', photoError);
          console.warn('⚠️ Фото не загружено из-за CORS на localhost, но учет времени продолжается');
          console.warn('⚠️ Запись времени создана БЕЗ фото, но работа началась!');
          // Продолжаем без фото - не блокируем начало работы
        }
      }
      
      // Обновляем статус задачи (только для реальных задач)
      if (task && task.status !== 'in_progress') {
        await changeTaskStatus(currentUser.uid, task.id, 'in_progress');
      }
      
      // Обновляем локальное состояние
      const fullEntry: TimeEntry = {
        ...entry,
        id: entryId,
        startPhotoUrl
      };
      
      // Определяем, что будет "текущей задачей" в UI
      const currentTaskObject = task || {
        id: taskId,
        task: taskName,
        projectId: project.id,
        projectName: project.name,
      } as Task;

      setCurrentEntry(fullEntry);
      setCurrentTask(currentTaskObject);
      setIsWorking(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      
      // Сохраняем в localStorage
      localStorage.setItem('currentTimeEntry', JSON.stringify(fullEntry));
      localStorage.setItem('currentTaskId', taskId);
      localStorage.setItem('currentEntryId', entryId); // Сохраняем ID записи отдельно
      
      // Проверяем, что сохранилось
      const savedId = localStorage.getItem('currentEntryId');
      console.log('📝 Проверка сохранения ID в localStorage:', { entryId, savedId, match: entryId === savedId });
      
      // Очищаем данные о паузах для новой сессии
      localStorage.removeItem('totalPauseDuration');
      localStorage.removeItem('pauseStartTime');
      localStorage.removeItem('activeTimeAtPause');
      
      console.log('🎉 УЧЕТ ВРЕМЕНИ УСПЕШНО НАЧАТ!');
      console.log('🏢 Проект:', project.name);
      console.log('ktiv:', taskName);
      if (estimate) console.log('📊 Смета:', estimate.name);
      if (service) console.log('🔧 Услуга:', service.name);
      
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
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    // Пытаемся восстановить данные если они отсутствуют
    let workingEntry = currentEntry;
    let workingTask = currentTask;
    
    if (!workingEntry) {
      console.error('No currentEntry found, trying to restore from localStorage');
      const savedEntry = localStorage.getItem('currentTimeEntry');
      const savedEntryId = localStorage.getItem('currentEntryId');
      if (savedEntry) {
        workingEntry = JSON.parse(savedEntry);
        if (workingEntry && !workingEntry.id && savedEntryId) {
          workingEntry.id = savedEntryId;
        }
        console.log('⚠️ Восстановлена запись из localStorage:', workingEntry);
      }
    }
    
    if (!workingEntry) {
      throw new Error('No active work session - entry missing');
    }
    
    if (!workingEntry.id) {
      // Последняя попытка получить ID
      const savedEntryId = localStorage.getItem('currentEntryId');
      if (savedEntryId) {
        workingEntry.id = savedEntryId;
        console.log('⚠️ ID восстановлен из localStorage:', savedEntryId);
      } else {
        console.error('Entry has no ID and cannot restore:', workingEntry);
        throw new Error('No active work session - entry ID missing');
      }
    }
    
    if (!workingTask) {
      console.error('No currentTask found, trying to restore');
      const savedTaskId = localStorage.getItem('currentTaskId');
      if (savedTaskId) {
        // Для виртуальной задачи
        if (savedTaskId.startsWith('estimate-')) {
          workingTask = { id: savedTaskId, task: workingEntry.taskName } as Task;
        } else {
          // Для реальной задачи
          workingTask = allTasks.find(t => t.id === savedTaskId) || null;
        }
        console.log('⚠️ Задача восстановлена:', workingTask);
      }
    }
    
    if (!workingTask) {
      throw new Error('No active work session - task missing');
    }
    
    // Проверяем обязательность фото
    if (requiresPhoto(workingTask) && !endPhoto) {
      throw new Error('End photo is required for this task');
    }
    
    try {
      // Загружаем фото, если есть
      let endPhotoUrl: string | undefined;
      if (endPhoto && workingEntry.id) {
        try {
          endPhotoUrl = await uploadTimeEntryPhoto(
            currentUser.uid,
            workingEntry.id,
            endPhoto,
            'end'
          );
        } catch (photoError) {
          console.error('Failed to upload end photo:', photoError);
          // Продолжаем без фото - не блокируем завершение работы
        }
      }
      
      // Завершаем сессию работы с корректным расчетом времени
      if (workingEntry.id) {
        await completeTimeEntryEnhanced(
          currentUser.uid,
          workingEntry.id,
          endPhotoUrl,
          comment,
          location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            ...(location.coords.accuracy && { accuracy: location.coords.accuracy }),
            timestamp: new Date(location.timestamp)
          } : undefined
        );
      }
      
      // Отправляем задачу на проверку (только для реальных задач)
      if (workingTask && !workingTask.id.startsWith('estimate-')) {
        await submitTaskForReview(currentUser.uid, workingTask.id);
      }
      
      // Очищаем состояние
      setCurrentEntry(null);
      setCurrentTask(null);
      setIsWorking(false);
      setIsPaused(false);
      setElapsedSeconds(0);
      
      // Очищаем localStorage
      localStorage.removeItem('currentTimeEntry');
      localStorage.removeItem('currentTaskId');
      localStorage.removeItem('currentEntryId');
      localStorage.removeItem('pauseStartTime');
      localStorage.removeItem('activeTimeAtPause');
      localStorage.removeItem('totalPauseDuration');
      
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
      // Используем улучшенную версию с корректным учетом времени
      await pauseTimeEntryEnhanced(currentUser.uid, currentEntry.id, reason);
      setIsPaused(true);
      
      // Обновляем запись в localStorage с новым статусом и временем паузы
      const now = new Date();
      const updatedEntry = { 
        ...currentEntry, 
        status: 'paused' as TimeEntryStatus,
        currentPauseStart: now
      };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      localStorage.setItem('pauseStartTime', now.toISOString());
      
      // Сохраняем текущее активное время на момент паузы
      localStorage.setItem('activeTimeAtPause', elapsedSeconds.toString());
      
      console.log('⏸️ Работа поставлена на паузу в', now.toLocaleTimeString());
      
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
      const entryRef = doc(db, `users/${currentUser.uid}/timeEntries`, currentEntry.id);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Time entry not found');
      }

      const currentData = entryDoc.data();
      const now = new Date();
      
      let pauseDuration = 0;
      let updatedPauses = currentData.pauses || [];
      
      if (currentData.currentPauseStart) {
        const pauseStart = currentData.currentPauseStart.toDate ? currentData.currentPauseStart.toDate() : new Date(currentData.currentPauseStart);
        pauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 1000); // Считаем в секундах
        
        updatedPauses.push({
          startTime: pauseStart,
          endTime: now,
          duration: Math.floor(pauseDuration / 60),
          reason: currentData.pauseReason
        });
      }
      
      const totalPauseDuration = (currentData.totalPauseDuration || 0) + pauseDuration;

      const updates = {
        status: 'active' as TimeEntryStatus,
        pauses: updatedPauses,
        totalPauseDuration,
        currentPauseStart: deleteField(),
        pauseReason: deleteField(),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(entryRef, updates);

      setIsPaused(false);
      
      const updatedEntry = { 
        ...currentEntry, 
        status: 'active' as TimeEntryStatus,
        currentPauseStart: undefined
      };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      localStorage.removeItem('pauseStartTime');
      
      console.log('▶️ Работа возобновлена в', now.toLocaleTimeString());
      
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
    currentSession: currentEntry, // Для обратной совместимости
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