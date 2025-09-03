/**
 * Унифицированная система учета времени (SSOT)
 * Объединяет функциональность timeEntryApi.ts и timeEntryEnhanced.ts
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
  increment,
  writeBatch,
  deleteField,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  writeBatch as createBatch,
  getDocs
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  StorageReference 
} from 'firebase/storage';
import { db, storage } from '../firebase/firebase';
import { getUserProfile } from './userApi';

// ==================== ТИПЫ ====================

export type TimeEntryStatus = 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'approved' 
  | 'pending_approval';

export interface PauseRecord {
  startTime: Date;
  endTime?: Date;
  reason?: string;
  duration?: number; // в минутах
}

export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  projectId?: string;
  estimateId?: string;
  serviceId?: string;
  
  // Основные временные метки
  startTime: Date;
  endTime?: Date;
  lastActiveTime?: Date;
  
  // Паузы и расчеты
  pauses?: PauseRecord[];
  totalPauseDuration?: number;
  currentPauseStart?: Date;
  activeDuration?: number;
  totalDuration?: number;
  duration?: number; // Alias for activeDuration for compatibility
  
  // Статус и контроль
  status: TimeEntryStatus;
  
  // Локация и фото
  startLocation?: any;
  endLocation?: any;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  
  // Финансы
  laborCost?: number;
  hourlyRate?: number;
  
  // Метаданные
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  
  // Дополнительные поля для совместимости с legacy кодом
  task?: string;
  project?: string;
  estimate?: string;
  description?: string;
  taskName?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  serviceName?: string;
  estimateName?: string;
  pauseReason?: string;
}

// Расширенная версия TimeEntry для совместимости
export interface EnhancedTimeEntry extends TimeEntry {
  // Расширенные поля для enhanced функциональности
}

// ==================== УТИЛИТЫ РАСЧЕТА ВРЕМЕНИ ====================

/**
 * Расчет активного времени работы с учетом пауз
 */
export const calculateActiveDuration = (
  startTime: Date,
  endTime: Date | null,
  pauses: PauseRecord[] = [],
  currentPauseStart?: Date
): number => {
  const now = new Date();
  const end = endTime || now;
  
  // Общее время от начала до конца (или до текущего момента)
  let totalMinutes = Math.floor((end.getTime() - startTime.getTime()) / 60000);
  
  // Вычитаем завершенные паузы
  let pauseMinutes = 0;
  pauses.forEach(pause => {
    if (pause.duration) {
      pauseMinutes += pause.duration;
    } else if (pause.startTime && pause.endTime) {
      pauseMinutes += Math.floor((pause.endTime.getTime() - pause.startTime.getTime()) / 60000);
    }
  });
  
  // Если есть активная пауза, вычитаем ее время
  if (currentPauseStart && !endTime) {
    const currentPauseDuration = Math.floor((now.getTime() - currentPauseStart.getTime()) / 60000);
    pauseMinutes += currentPauseDuration;
  }
  
  // Активное время = общее время - время пауз
  const activeMinutes = Math.max(0, totalMinutes - pauseMinutes);
  
  return activeMinutes;
};

/**
 * Форматирование времени для отображения
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
};

/**
 * Форматирование времени в формате ЧЧ:ММ:СС
 */
export const formatTimeHMS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

// ==================== CRUD ОПЕРАЦИИ ====================

/**
 * Загрузка фото для записи времени
 */
export const uploadTimeEntryPhoto = async (
  userId: string,
  entryId: string,
  photoFile: File,
  photoType: 'start' | 'end'
): Promise<string> => {
  const photoRef: StorageReference = ref(
    storage,
    `timeEntries/${userId}/${entryId}/${photoType}_photo_${Date.now()}.jpg`
  );
  
  const snapshot = await uploadBytes(photoRef, photoFile);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
};

/**
 * Создание новой записи времени
 */
export const createTimeEntry = async (
  userId: string,
  data: Partial<TimeEntry>
): Promise<string> => {
  const now = new Date();
  
  const timeEntry: Omit<TimeEntry, 'id'> = {
    userId,
    taskId: data.taskId || '',
    projectId: data.projectId,
    estimateId: data.estimateId,
    serviceId: data.serviceId,
    startTime: now,
    status: 'active',
    activeDuration: 0,
    totalDuration: 0,
    totalPauseDuration: 0,
    pauses: [],
    startLocation: data.startLocation,
    startPhotoUrl: data.startPhotoUrl,
    createdAt: now,
    updatedAt: now,
    task: data.task,
    project: data.project,
    estimate: data.estimate,
    description: data.description,
    comment: data.comment
  };

  const docRef = await addDoc(
    collection(db, `users/${userId}/timeEntries`),
    {
      ...timeEntry,
      startTime: Timestamp.fromDate(timeEntry.startTime),
      createdAt: Timestamp.fromDate(timeEntry.createdAt),
      updatedAt: Timestamp.fromDate(timeEntry.updatedAt)
    }
  );

  return docRef.id;
};

/**
 * Обновление записи времени
 */
export const updateTimeEntry = async (
  userId: string,
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  // Конвертируем Date объекты в Timestamp
  if (updates.endTime) {
    updateData.endTime = Timestamp.fromDate(updates.endTime);
  }
  if (updates.lastActiveTime) {
    updateData.lastActiveTime = Timestamp.fromDate(updates.lastActiveTime);
  }
  if (updates.currentPauseStart) {
    updateData.currentPauseStart = Timestamp.fromDate(updates.currentPauseStart);
  }
  if (updates.completedAt) {
    updateData.completedAt = Timestamp.fromDate(updates.completedAt);
  }

  await updateDoc(entryRef, updateData);
};

/**
 * Начало паузы с сохранением времени
 */
export const pauseTimeEntry = async (
  userId: string,
  entryId: string,
  reason?: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const now = new Date();
  
  // Сохраняем время начала паузы
  const updates = {
    status: 'paused',
    currentPauseStart: Timestamp.fromDate(now),
    lastActiveTime: Timestamp.fromDate(now),
    pauseReason: reason || '',
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(entryRef, updates);
  
  console.log('⏸️ Пауза начата:', {
    time: now.toLocaleTimeString(),
    reason
  });
};

/**
 * Возобновление работы с расчетом времени паузы
 */
export const resumeTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentData = entryDoc.data();
  const now = new Date();
  
  // Рассчитываем длительность паузы
  let pauseDuration = 0;
  let updatedPauses = currentData.pauses || [];
  
  if (currentData.currentPauseStart) {
    const pauseStart = currentData.currentPauseStart.toDate 
      ? currentData.currentPauseStart.toDate() 
      : new Date(currentData.currentPauseStart);
    
    pauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 60000);
    
    // Добавляем запись о паузе
    const pauseRecord: PauseRecord = {
      startTime: pauseStart,
      endTime: now,
      duration: pauseDuration,
      reason: currentData.pauseReason || ''
    };
    
    updatedPauses.push(pauseRecord);
  }
  
  // Обновляем общее время пауз
  const totalPauseDuration = (currentData.totalPauseDuration || 0) + pauseDuration;
  
  // Очищаем поля паузы и обновляем статус
  const updates = {
    status: 'active',
    pauses: updatedPauses,
    totalPauseDuration,
    currentPauseStart: deleteField(),
    pauseReason: deleteField(),
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(entryRef, updates);
  
  console.log('▶️ Работа возобновлена:', {
    time: now.toLocaleTimeString(),
    pauseDuration: `${pauseDuration} мин`,
    totalPauseDuration: `${totalPauseDuration} мин`
  });
};

/**
 * Завершение работы с финальным расчетом времени и себестоимости
 */
export const completeTimeEntry = async (
  userId: string,
  entryId: string,
  endPhotoUrl?: string,
  comment?: string,
  endLocation?: any
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);

  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }

  const currentData = entryDoc.data();
  const now = new Date();

  // 1. Рассчитываем длительность
  const startTime = currentData.startTime.toDate ? currentData.startTime.toDate() : new Date(currentData.startTime);
  const totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 60000);
  const activeDuration = calculateActiveDuration(
    startTime,
    now,
    currentData.pauses || [],
    currentData.currentPauseStart?.toDate ? currentData.currentPauseStart.toDate() : undefined
  );

  // 2. Рассчитываем себестоимость
  let laborCost = 0;
  const userProfile = await getUserProfile(userId);
  if (userProfile?.hourlyRate && userProfile.hourlyRate > 0) {
    laborCost = (activeDuration / 60) * userProfile.hourlyRate;
  }
  
  // 3. Готовим обновление для TimeEntry
  const updates: any = {
    status: 'completed',
    endTime: Timestamp.fromDate(now),
    completedAt: Timestamp.fromDate(now),
    duration: activeDuration,
    totalDuration,
    activeDuration,
    totalPauseDuration: currentData.totalPauseDuration || 0,
    laborCost: laborCost > 0 ? laborCost : 0,
    ...(endPhotoUrl && { endPhotoUrl }),
    ...(comment && { comment }),
    ...(endLocation && { endLocation }),
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);

  // Обновляем саму запись времени
  batch.update(entryRef, updates);

  // 4. Обновляем себестоимость в смете, если она есть
  if (currentData.estimateId && currentData.serviceId && laborCost > 0) {
    const estimateRef = doc(db, `users/${userId}/estimates`, currentData.estimateId);
    
    const estimateSnap = await getDoc(estimateRef);
    if(estimateSnap.exists()) {
      const estimateData = estimateSnap.data();
      const items = estimateData.items || [];
      
      const itemIndex = items.findIndex((item: any) => item.id === currentData.serviceId);
      if (itemIndex > -1) {
        const currentCost = items[itemIndex].totalLaborCost || 0;
        items[itemIndex].totalLaborCost = currentCost + laborCost;
        
        batch.update(estimateRef, { items: items });
      }
    }
  }

  await batch.commit();
  
  console.log('✅ Работа завершена:', {
    time: now.toLocaleTimeString(),
    activeDuration: `${activeDuration} мин`,
    laborCost: `${laborCost.toFixed(2)} $`
  });
};

// ==================== ПОТОКИ ДАННЫХ ====================

/**
 * Получение потока записей времени для задачи
 */
export const getTimeEntriesByTaskStream = (
  userId: string,
  taskId: string,
  callback: (entries: TimeEntry[]) => void
) => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('taskId', '==', taskId),
    orderBy('startTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(data.startTime),
        endTime: data.endTime?.toDate() || null,
        lastActiveTime: data.lastActiveTime?.toDate() || null,
        currentPauseStart: data.currentPauseStart?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        approvedAt: data.approvedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as TimeEntry;
    });
    
    callback(entries);
  });
};

/**
 * Получение потока всех записей времени пользователя
 */
export const getTimeEntriesStream = (
  userId: string,
  callback: (entries: TimeEntry[]) => void,
  filters?: {
    status?: TimeEntryStatus;
    projectId?: string;
    estimateId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) => {
  let q = query(
    collection(db, `users/${userId}/timeEntries`),
    orderBy('startTime', 'desc')
  );

  // Добавляем фильтры
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  if (filters?.estimateId) {
    q = query(q, where('estimateId', '==', filters.estimateId));
  }

  return onSnapshot(q, (snapshot) => {
    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(data.startTime),
        endTime: data.endTime?.toDate() || null,
        lastActiveTime: data.lastActiveTime?.toDate() || null,
        currentPauseStart: data.currentPauseStart?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        approvedAt: data.approvedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as TimeEntry;
    });
    
    callback(entries);
  });
};

// ==================== АНАЛИТИКА И ОТЧЕТЫ ====================

/**
 * Расчет общей длительности по задаче
 */
export const calculateTaskTotalDuration = async (
  userId: string,
  taskId: string
): Promise<{
  totalMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
}> => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('taskId', '==', taskId),
    where('status', 'in', ['completed', 'approved'])
  );

  const snapshot = await getDocs(q);
  
  let totalMinutes = 0;
  let approvedMinutes = 0;
  let pendingMinutes = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const duration = data.activeDuration || data.duration || 0;
    
    totalMinutes += duration;
    
    if (data.status === 'approved') {
      approvedMinutes += duration;
    } else {
      pendingMinutes += duration;
    }
  });

  return {
    totalMinutes,
    approvedMinutes,
    pendingMinutes
  };
};

/**
 * Получение детальной статистики по времени
 */
export const getTimeEntryStatistics = async (
  userId: string,
  entryId: string
): Promise<{
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  activeDuration: number;
  pauseDuration: number;
  pauseCount: number;
  efficiency: number;
  currentStatus: string;
}> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const data = entryDoc.data();
  const startTime = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
  const endTime = data.endTime?.toDate ? data.endTime.toDate() : null;
  const now = new Date();
  
  // Рассчитываем времена
  const totalDuration = data.totalDuration || Math.floor(((endTime || now).getTime() - startTime.getTime()) / 60000);
  const pauseDuration = data.totalPauseDuration || 0;
  const activeDuration = data.activeDuration || calculateActiveDuration(
    startTime,
    endTime,
    data.pauses || [],
    data.currentPauseStart?.toDate ? data.currentPauseStart.toDate() : undefined
  );
  
  const efficiency = totalDuration > 0 ? Math.round((activeDuration / totalDuration) * 100) : 100;
  
  return {
    startTime,
    endTime,
    totalDuration,
    activeDuration,
    pauseDuration,
    pauseCount: (data.pauses || []).length + (data.currentPauseStart ? 1 : 0),
    efficiency,
    currentStatus: data.status
  };
};

// ==================== АДМИНИСТРАТИВНЫЕ ФУНКЦИИ ====================

/**
 * Подтверждение записей времени
 */
export const approveTimeEntries = async (
  userId: string,
  entryIds: string[],
  approvedBy: string
): Promise<void> => {
  const batch = createBatch(db);
  const now = new Date();

  entryIds.forEach(entryId => {
    const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
    batch.update(entryRef, {
      status: 'approved',
      approvedAt: Timestamp.fromDate(now),
      approvedBy,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

/**
 * Удаление записи времени
 */
export const deleteTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  await deleteDoc(entryRef);
};

// ==================== ОБРАТНАЯ СОВМЕСТИМОСТЬ ====================

// Экспорт enhanced функций под старыми именами для совместимости
export const pauseTimeEntryEnhanced = pauseTimeEntry;
export const resumeTimeEntryEnhanced = resumeTimeEntry;
export const completeTimeEntryEnhanced = completeTimeEntry;

// Удаляем конфликтующий alias - уже есть интерфейс EnhancedTimeEntry выше

// Экспорт всех функций
export default {
  // CRUD
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  uploadTimeEntryPhoto,
  
  // Управление состоянием
  pauseTimeEntry,
  resumeTimeEntry, 
  completeTimeEntry,
  
  // Enhanced функции (aliases)
  pauseTimeEntryEnhanced,
  resumeTimeEntryEnhanced,
  completeTimeEntryEnhanced,
  
  // Потоки данных
  getTimeEntriesByTaskStream,
  getTimeEntriesStream,
  
  // Аналитика
  calculateTaskTotalDuration,
  getTimeEntryStatistics,
  calculateActiveDuration,
  
  // Утилиты
  formatDuration,
  formatTimeHMS,
  
  // Административные
  approveTimeEntries
};