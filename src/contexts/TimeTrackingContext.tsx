/**
 * ============================================================================
 * TIME TRACKING CONTEXT - ЦЕНТРАЛЬНАЯ СИСТЕМА УЧЕТА ВРЕМЕНИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Глобальный контекст для управления состоянием учета времени во всем приложении.
 * Обеспечивает единую точку управления таймерами, записями времени и состоянием работы.
 * 
 * КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 🎯 УПРАВЛЕНИЕ ТАЙМЕРАМИ:
 * ├─ startWork() - запуск учета времени по задаче/смете
 * ├─ stopWork() - остановка и сохранение записи
 * ├─ pauseWork() - приостановка с сохранением времени
 * └─ resumeWork() - возобновление после паузы
 * 
 * 📊 СОСТОЯНИЕ СИСТЕМЫ:
 * ├─ isWorking - флаг активного учета времени
 * ├─ isPaused - флаг паузы
 * ├─ currentEntry - текущая запись времени
 * ├─ elapsedSeconds - прошедшее время в секундах
 * └─ timeTrackingError - ошибки системы
 * 
 * 🔄 REAL-TIME ОБНОВЛЕНИЯ:
 * ├─ Автоматическое обновление счетчика времени
 * ├─ Синхронизация с Firebase в реальном времени
 * ├─ Восстановление состояния после перезагрузки
 * └─ Optimistic UI updates
 * 
 * 🛡️ БЕЗОПАСНОСТЬ ДАННЫХ:
 * ├─ Валидация всех входных данных
 * ├─ Избежание undefined значений для Firestore
 * ├─ Graceful обработка ошибок сети
 * └─ Автоматическое сохранение при сбоях
 * 
 * 🎨 V2 АРХИТЕКТУРА:
 * ├─ Использование типов из src/types/ (Project, Task, Estimate)
 * ├─ Интеграция с timeEntryUnified API
 * ├─ Поддержка estimate.number вместо estimate.name
 * └─ Совместимость с новой системой смет
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Исправлены Firestore undefined ошибки
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  changeTaskStatus, 
  submitTaskForReview,
  getTasksStream,
} from '../api/taskApi';
import { 
  createTimeEntry, 
  updateTimeEntry, 
  TimeEntry,
  TimeEntryStatus,
  getTimeEntriesByTaskStream,
  getTimeEntriesStream,
  uploadTimeEntryPhoto,
  pauseTimeEntry,
  resumeTimeEntry,
  completeTimeEntry
} from '../api/timeEntryUnified';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Estimate, EstimateItem } from '../types/estimate.types';
import { Project } from '../types/project.types';
import { Task, TaskStatus } from '../types/task.types';

// Типы для глобального управления UI
export interface ModalPrefillData {
  taskId?: string;
  taskType?: 'project_task' | 'estimate_task';
  projectId?: string;
  projectName?: string;
  estimateId?: string;
  estimateName?: string;
  task?: Task;
  project?: Project;
  estimate?: Estimate;
  service?: EstimateItem;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  message?: string;
}

export interface TimeEntryValidationData {
  startTime: Date;
  endTime?: Date;
  taskId?: string;
  projectId: string;
  duration?: number;
}

interface TimeTrackingContextType {
  // Текущее состояние работы
  isWorking: boolean;
  isPaused: boolean;
  currentEntry: TimeEntry | null;
  currentSession: TimeEntry | null; // Для обратной совместимости
  currentTask: Task | null;
  elapsedSeconds: number;
  isStartingWork: boolean; // <-- НОВОЕ СОСТОЯНИЕ
  timeTrackingError: string | null; // <-- НОВЫЙ STATE ДЛЯ ОШИБОК
  
  // Управление сессиями работы
  startWork: (payload: StartWorkPayload) => Promise<void>;
  
  stopWork: (
    endPhoto?: File,
    comment?: string,
    location?: GeolocationPosition
  ) => Promise<void>;
  
  pauseWork: (reason?: string) => Promise<void>;
  resumeWork: () => Promise<void>;
  clearTimeTrackingError: () => void; // <-- НОВЫЙ МЕТОД
  
  // НОВОЕ: Глобальное состояние UI
  isModalOpen: boolean;
  modalPrefillData: ModalPrefillData | null;
  
  // НОВЫЕ: Методы управления UI
  openTimeEntryModal: (prefillData?: ModalPrefillData) => void;
  closeTimeEntryModal: () => void;
  
  // Управление историей времени
  timeEntries: TimeEntry[];
  isLoadingTimeEntries: boolean;
  refreshTimeEntries: () => Promise<void>;
  
  // Валидация
  validateTimeEntry: (data: TimeEntryValidationData) => ValidationResult;
  
  // Получение данных (существующие)
  getTaskTimeEntries: (taskId: string) => Promise<TimeEntry[]>;
  getTotalTaskDuration: (taskId: string) => number;
  
  // Проверки (существующие)
  canStartWork: (task: Task) => boolean;
  requiresPhoto: (task: Task) => boolean;
}

export interface StartWorkPayload {
  task?: Task;
  estimate?: Estimate;
  service?: EstimateItem;
  project: Project;
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

// Утилита для проверки доступности localStorage
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const TimeTrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  // Существующее состояние работы
  const [isWorking, setIsWorking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isStartingWork, setIsStartingWork] = useState(false); // <-- НОВОЕ СОСТОЯНИЕ
  const [timeTrackingError, setTimeTrackingError] = useState<string | null>(null); // <-- НОВЫЙ STATE
  const [taskEntries, setTaskEntries] = useState<Record<string, TimeEntry[]>>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // ВОССТАНОВЛЕННЫЕ СОСТОЯНИЯ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPrefillData, setModalPrefillData] = useState<ModalPrefillData | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);

  // Проверка localStorage при инициализации
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      console.warn('LocalStorage is not available. Time tracking session will not be restored across page reloads.');
      setTimeTrackingError('Ваш браузер не поддерживает сохранение сессии. Учет времени не будет восстановлен после перезагрузки страницы.');
    }
  }, []);

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

  // НОВОЕ: Загрузка истории времени
  useEffect(() => {
    if (!currentUser) return;
    
    setIsLoadingTimeEntries(true);
    const unsubscribe = getTimeEntriesStream(
      currentUser.uid,
      (entries: TimeEntry[]) => {
        setTimeEntries(entries);
        setIsLoadingTimeEntries(false);
        console.log('✅ Time entries loaded:', entries.length);
      }
    );
    
    return () => unsubscribe();
  }, [currentUser]);

  // Таймер с учетом пауз
  useEffect(() => {
    if (!isWorking || !currentEntry) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        const now = new Date();
        const startTime = new Date(currentEntry.startTime);
        
        // Получаем общее время пауз из localStorage, рассчитанное локально
        const totalPauseSeconds = parseInt(localStorage.getItem('totalPauseDuration') || '0', 10);
        
        // Рассчитываем общее время с момента старта
        const totalElapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        // Активное время = общее время - все паузы
        const activeSeconds = Math.max(0, totalElapsedSeconds - totalPauseSeconds);
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
    
    setIsStartingWork(true); // <-- ВКЛЮЧАЕМ ИНДИКАТОР ЗАГРУЗКИ

    const { task, estimate, service, project, startPhoto, location } = payload;

    // Определяем, что является основной "задачей" для учета времени
    const workTarget = task || service || estimate;
    if (!workTarget) {
      throw new Error('Необходимо указать задачу или смету для начала работы');
    }
    
    // ID для записи в TimeEntry. Для сметы это будет "виртуальный" ID.
    const taskId = task?.id || `estimate-${estimate?.id}-${service?.id || 'main'}`;
    const taskName = task?.task || service?.name || estimate?.number || 'Работа';

    try {
      // Создаем "черновик" записи без времени (только определенные значения)
      const entryDraft: Partial<TimeEntry> = {
        userId: currentUser.uid,
        taskId: taskId,
        taskName: taskName,
        projectId: project.id,
        projectName: project.name,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || '',
        status: 'active' as TimeEntryStatus
      };

      // Добавляем только определенные значения (избегаем undefined)
      if (estimate?.id) {
        entryDraft.estimateId = estimate.id;
        entryDraft.estimateName = estimate.number;
      }
      
      if (service?.id) {
        entryDraft.serviceId = service.id;
        entryDraft.serviceName = service.name;
      }
      
      if (location) {
        entryDraft.startLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          ...(location.coords.accuracy && { accuracy: location.coords.accuracy }),
          timestamp: new Date(location.timestamp)
        };
      }
      
      // Шаг 1: Создаем запись в БД, которая вернет ID.
      // startTime будет установлено на сервере.
      const entryId = await createTimeEntry(currentUser.uid, entryDraft);
      console.log('✅ Запись времени создана с ID:', entryId);
      
      if (!entryId) {
        throw new Error('Failed to create time entry - no ID returned');
      }

      // Шаг 2: Получаем созданную запись с серверным временем
      const entryRef = doc(db, `users/${currentUser.uid}/timeEntries`, entryId);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists()) {
        throw new Error('Failed to fetch the newly created time entry.');
      }

      const serverEntry = {
        ...entrySnap.data(),
        id: entrySnap.id,
        // Безопасно конвертируем серверные Timestamp в Date
        startTime: entrySnap.data().startTime ? new Date(entrySnap.data().startTime.seconds * 1000) : new Date(),
        createdAt: entrySnap.data().createdAt ? new Date(entrySnap.data().createdAt.seconds * 1000) : new Date(),
        updatedAt: entrySnap.data().updatedAt ? new Date(entrySnap.data().updatedAt.seconds * 1000) : new Date(),
      } as TimeEntry;
      
      // Шаг 3: Загружаем фото, если есть
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
            serverEntry.startPhotoUrl = startPhotoUrl; // Обновляем локальный объект
            console.log('✅ Фото успешно загружено');
          }
        } catch (photoError) {
          console.error('Failed to upload start photo:', photoError);
          console.warn('⚠️ Фото не загружено из-за CORS на localhost, но учет времени продолжается');
          console.warn('⚠️ Запись времени создана БЕЗ фото, но работа началась!');
          // Продолжаем без фото - не блокируем начало работы
        }
      }
      
      // Шаг 4: Обновляем статус задачи (только для реальных задач)
      if (task && task.status !== 'in_progress') {
        await changeTaskStatus(currentUser.uid, task.id, 'in_progress');
      }
      
      // Шаг 5: Обновляем локальное состояние, используя данные с сервера
      const currentTaskObject = task || {
        id: taskId,
        task: taskName,
        projectId: project.id,
        projectName: project.name,
      } as Task;

      setCurrentEntry(serverEntry);
      setCurrentTask(currentTaskObject);
      setIsWorking(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      
      // Сохраняем в localStorage
      localStorage.setItem('currentTimeEntry', JSON.stringify(serverEntry));
      localStorage.setItem('currentTaskId', taskId);
      localStorage.setItem('currentEntryId', entryId); // Сохраняем ID записи отдельно
      
      // Проверяем, что сохранилось
      const savedId = localStorage.getItem('currentEntryId');
      console.log('📝 Проверка сохранения ID в localStorage:', { entryId, savedId, match: entryId === savedId });
      
      // Очищаем данные о паузах для новой сессии
      localStorage.setItem('totalPauseDuration', '0');
      localStorage.removeItem('pauseStartTime');
      
      console.log('🎉 УЧЕТ ВРЕМЕНИ УСПЕШНО НАЧАТ!');
      console.log('🏢 Проект:', project.name);
      console.log('Актив:', taskName);
      if (estimate) console.log('📊 Смета:', estimate.number);
      if (service) console.log('🔧 Услуга:', service.name);
      
    } catch (error: any) {
      console.error('Error starting work:', error);
      // В случае ошибки сбрасываем состояние
      setIsWorking(false);
      setCurrentEntry(null);
      setCurrentTask(null);
      setTimeTrackingError(`Не удалось начать работу: ${error.message}`);
      throw error;
    } finally {
      setIsStartingWork(false); // <-- ВЫКЛЮЧАЕМ ИНДИКАТОР ЗАГРУЗКИ
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
          workingTask = { id: savedTaskId, task: workingEntry.taskName || workingEntry.task || 'Неизвестная задача' } as Task;
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
        await completeTimeEntry(
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
      // Очищаем totalPauseDuration после завершения работы
      localStorage.removeItem('totalPauseDuration');
      
    } catch (error: any) {
      console.error('Error stopping work:', error);
      // Не сбрасываем состояние, чтобы пользователь мог повторить попытку
      setTimeTrackingError(`Не удалось остановить работу: ${error.message}`);
      throw error;
    }
  };

  const pauseWork = async (reason?: string) => {
    if (!currentUser || !currentEntry || !currentEntry.id) {
      throw new Error('No active work session');
    }
    
    // Оптимистичное обновление UI
    setIsPaused(true);

    try {
      // Вызываем API
      await pauseTimeEntry(currentUser.uid, currentEntry.id, reason);
      
      // Фиксируем состояние после успешного ответа
      const now = new Date();
      const updatedEntry = { 
        ...currentEntry, 
        status: 'paused' as TimeEntryStatus,
        currentPauseStart: now
      };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      
      // Фиксируем время начала паузы для локального расчета
      localStorage.setItem('pauseStartTime', now.toISOString());
      
      console.log('⏸️ Работа поставлена на паузу в', now.toLocaleTimeString());
      
    } catch (error: any) {
      console.error('Error pausing work:', error);
      // Откатываем UI в случае ошибки
      setIsPaused(false);
      setTimeTrackingError(`Не удалось поставить на паузу: ${error.message}`);
      throw error;
    }
  };

  const resumeWork = async () => {
    if (!currentUser || !currentEntry || !currentEntry.id) {
      throw new Error('No paused work session');
    }
    
    // Оптимистичное обновление UI
    setIsPaused(false);

    try {
      // Вызываем API для возобновления на сервере
      await resumeTimeEntry(currentUser.uid, currentEntry.id);
      
      // Локально рассчитываем и обновляем общее время пауз
      const pauseStartTime = localStorage.getItem('pauseStartTime');
      if (pauseStartTime) {
        const pauseStart = new Date(pauseStartTime);
        const now = new Date();
        const currentPauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 1000);
        
        const totalPauseDuration = parseInt(localStorage.getItem('totalPauseDuration') || '0', 10);
        const newTotalPauseDuration = totalPauseDuration + currentPauseDuration;
        
        localStorage.setItem('totalPauseDuration', newTotalPauseDuration.toString());
        localStorage.removeItem('pauseStartTime');
        
        console.log(`▶️ Пауза завершена. Длительность: ${currentPauseDuration} сек. Общее время пауз: ${newTotalPauseDuration} сек.`);
      }
      
      // Обновляем локальное состояние
      const updatedEntry = { 
        ...currentEntry, 
        status: 'active' as TimeEntryStatus,
        currentPauseStart: undefined
      };
      setCurrentEntry(updatedEntry);
      localStorage.setItem('currentTimeEntry', JSON.stringify(updatedEntry));
      
      console.log('▶️ Работа возобновлена');
      
    } catch (error: any) {
      console.error('Error resuming work:', error);
      // Откатываем UI в случае ошибки
      setIsPaused(true);
      setTimeTrackingError(`Не удалось возобновить работу: ${error.message}`);
      throw error;
    }
  };

  const getTaskTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
    return taskEntries[taskId] || [];
  };

  const clearTimeTrackingError = () => {
    setTimeTrackingError(null);
  };

  const getTotalTaskDuration = (taskId: string): number => {
    const entries = taskEntries[taskId] || [];
    return entries.reduce((total, entry) => {
      if ((entry.duration || entry.activeDuration) && (entry.status === 'completed' || entry.status === 'approved')) {
        return total + (entry.duration || entry.activeDuration || 0);
      }
      return total;
    }, 0);
  };

  // НОВЫЕ: Методы управления глобальным UI
  const openTimeEntryModal = (prefillData?: ModalPrefillData) => {
    console.log('🎬 Opening time entry modal with data:', prefillData);
    setModalPrefillData(prefillData || null);
    setIsModalOpen(true);
  };

  const closeTimeEntryModal = () => {
    console.log('❌ Closing time entry modal');
    setIsModalOpen(false);
    setModalPrefillData(null);
  };

  // НОВЫЙ: Обновление истории времени
  const refreshTimeEntries = async (): Promise<void> => {
    if (!currentUser) return;
    
    setIsLoadingTimeEntries(true);
    try {
      // Вызываем обновление через подписку - данные обновятся автоматически
      console.log('🔄 Refreshing time entries');
    } catch (error) {
      console.error('Error refreshing time entries:', error);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };

  // НОВЫЙ: Валидация записи времени
  const validateTimeEntry = (data: TimeEntryValidationData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка обязательных полей
    if (!data.projectId) {
      errors.push('Проект обязателен для записи времени');
    }

    if (!data.startTime) {
      errors.push('Время начала обязательно');
    }

    // Проверка продолжительности
    if (data.endTime && data.startTime) {
      const duration = (data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60; // в минутах
      
      if (duration <= 0) {
        errors.push('Время окончания должно быть больше времени начала');
      }
      
      if (duration > 12 * 60) { // 12 часов
        warnings.push('Продолжительность работы превышает 12 часов');
      }

      if (duration < 1) { // меньше минуты
        warnings.push('Очень короткая запись времени (менее 1 минуты)');
      }
    }

    // Проверка времени в будущем
    if (data.startTime && data.startTime > new Date()) {
      errors.push('Нельзя начать работу в будущем времени');
    }

    // Проверка пересечения с текущей активной сессией
    if (isWorking && currentEntry && data.startTime) {
      const currentStart = new Date(currentEntry.startTime);
      if (data.startTime >= currentStart && !data.endTime) {
        errors.push('У вас уже есть активная сессия работы');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      message: errors.length > 0 ? errors[0] : warnings.length > 0 ? warnings[0] : undefined
    };
  };

  const value: TimeTrackingContextType = {
    // Существующие свойства работы
    isWorking,
    isPaused,
    currentEntry,
    currentSession: currentEntry, // Для обратной совместимости
    currentTask,
    elapsedSeconds,
    isStartingWork, // <-- EXPORT
    timeTrackingError, // <-- EXPORT
    
    // Существующие методы работы
    startWork,
    stopWork,
    pauseWork,
    resumeWork,
    clearTimeTrackingError, // <-- EXPORT
    
    // НОВЫЕ: Глобальное состояние UI
    isModalOpen,
    modalPrefillData,
    
    // НОВЫЕ: Методы управления UI
    openTimeEntryModal,
    closeTimeEntryModal,
    
    // НОВЫЕ: Управление историей времени
    timeEntries,
    isLoadingTimeEntries,
    refreshTimeEntries,
    
    // НОВЫЕ: Валидация
    validateTimeEntry,
    
    // Существующие методы получения данных
    getTaskTimeEntries,
    getTotalTaskDuration,
    
    // Существующие проверки
    canStartWork,
    requiresPhoto
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
};