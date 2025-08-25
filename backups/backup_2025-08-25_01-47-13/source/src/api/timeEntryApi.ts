// Модуль для работы с сессиями работы (Time Entries)
// Структура хранения: users/{userId}/timeEntries/{entryId}
// Каждая сессия работы привязана к конкретной задаче и фиксирует время работы

import { db, storage } from '../firebase/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Статусы сессии работы
export type TimeEntryStatus = 
  | 'active'      // Активная - работа идет прямо сейчас
  | 'paused'      // На паузе - временно приостановлена
  | 'completed'   // Завершена - работа закончена
  | 'approved';   // Утверждена - одобрена руководителем в табеле

export interface TimeEntry {
  id?: string;
  taskId: string;  // Привязка к задаче (обязательно)
  taskName?: string;
  projectId?: string;  // Привязка к проекту через задачу
  projectName?: string;
  employeeId: string;  // ID исполнителя
  employeeName?: string;
  
  // Временные метки
  startTime: any;  // Время начала сессии
  endTime?: any;   // Время окончания сессии
  duration?: number;  // Длительность в минутах (автоматически рассчитывается)
  
  // Фотофиксация
  startPhotoUrl?: string;  // URL фото ДО начала работ
  endPhotoUrl?: string;    // URL фото ПОСЛЕ завершения работ
  
  // Геолокация
  startLocation?: { 
    latitude: number; 
    longitude: number;
    accuracy?: number;
    timestamp?: any;
  };
  endLocation?: { 
    latitude: number; 
    longitude: number;
    accuracy?: number;
    timestamp?: any;
  };
  
  // Комментарии и описание
  comment?: string;  // Комментарий о проделанной работе
  description?: string;  // Описание работы в этой сессии
  
  // Статус и метаданные
  status: TimeEntryStatus;
  pauseReason?: string;  // Причина паузы (если применимо)
  
  // Системные поля
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Загрузка фотографии в Firebase Storage
 */
export const uploadTimeEntryPhoto = async (
  userId: string,
  entryId: string,
  photoFile: File,
  photoType: 'start' | 'end'
): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${photoType}_${timestamp}_${photoFile.name}`;
  const storagePath = `timeTracking/${userId}/${entryId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  const snapshot = await uploadBytes(storageRef, photoFile);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
};

/**
 * Создание новой сессии работы
 */
export const createTimeEntry = async (
  userId: string,
  entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const entriesPath = `users/${userId}/timeEntries`;
  
  const entryWithTimestamp = {
    ...entry,
    status: 'active' as TimeEntryStatus,
    startTime: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, entriesPath), entryWithTimestamp);
  return docRef.id;
};

/**
 * Обновление сессии работы (например, при завершении)
 */
export const updateTimeEntry = async (
  userId: string,
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  
  // Если есть endTime, автоматически рассчитываем duration
  let updatesWithDuration = { ...updates };
  if (updates.endTime && !updates.duration) {
    // Получаем текущую запись для расчета duration
    const snapshot = await getDocs(query(collection(db, `users/${userId}/timeEntries`), where('__name__', '==', entryId)));
    if (!snapshot.empty) {
      const currentEntry = snapshot.docs[0].data();
      if (currentEntry.startTime) {
        const start = currentEntry.startTime.toDate ? currentEntry.startTime.toDate() : new Date(currentEntry.startTime);
        const end = updates.endTime instanceof Date ? updates.endTime : new Date();
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        updatesWithDuration.duration = durationMinutes;
      }
    }
  }
  
  const updatesWithTimestamp = {
    ...updatesWithDuration,
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(entryRef, updatesWithTimestamp);
};

/**
 * Завершение активной сессии работы
 */
export const completeTimeEntry = async (
  userId: string,
  entryId: string,
  endPhotoUrl?: string,
  comment?: string,
  endLocation?: TimeEntry['endLocation']
): Promise<void> => {
  const updates: Partial<TimeEntry> = {
    status: 'completed',
    endTime: serverTimestamp(),
    ...(endPhotoUrl && { endPhotoUrl }),
    ...(comment && { comment }),
    ...(endLocation && { endLocation })
  };
  
  await updateTimeEntry(userId, entryId, updates);
};

/**
 * Приостановка сессии работы
 */
export const pauseTimeEntry = async (
  userId: string,
  entryId: string,
  pauseReason?: string
): Promise<void> => {
  const updates: Partial<TimeEntry> = {
    status: 'paused',
    ...(pauseReason && { pauseReason })
  };
  
  await updateTimeEntry(userId, entryId, updates);
};

/**
 * Возобновление приостановленной сессии
 */
export const resumeTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const updates: Partial<TimeEntry> = {
    status: 'active',
    pauseReason: undefined
  };
  
  await updateTimeEntry(userId, entryId, updates);
};

/**
 * Получение потока сессий работы для задачи
 */
export const getTimeEntriesByTaskStream = (
  userId: string,
  taskId: string,
  callback: (entries: TimeEntry[]) => void
) => {
  const entriesPath = `users/${userId}/timeEntries`;
  const q = query(
    collection(db, entriesPath),
    where('taskId', '==', taskId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as TimeEntry[];
    
    // Сортируем на клиенте
    entries.sort((a, b) => {
      const aTime = a.startTime?.toDate?.()?.getTime() || 0;
      const bTime = b.startTime?.toDate?.()?.getTime() || 0;
      return bTime - aTime; // desc
    });
    
    callback(entries);
  });
};

/**
 * Получение потока всех сессий работы пользователя
 */
export const getTimeEntriesStream = (
  userId: string,
  filters?: {
    employeeId?: string;
    projectId?: string;
    status?: TimeEntryStatus;
    startDate?: Date;
    endDate?: Date;
  },
  callback?: (entries: TimeEntry[]) => void
) => {
  const entriesPath = `users/${userId}/timeEntries`;
  let q = query(collection(db, entriesPath));
  
  // Применяем фильтры
  if (filters?.employeeId) {
    q = query(q, where('employeeId', '==', filters.employeeId));
  }
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  // Сортировка по времени начала
  q = query(q, orderBy('startTime', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    let entries = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as TimeEntry[];
    
    // Фильтрация по датам на клиенте (чтобы избежать сложных индексов)
    if (filters?.startDate || filters?.endDate) {
      entries = entries.filter(entry => {
        const entryStart = entry.startTime?.toDate ? entry.startTime.toDate() : new Date(entry.startTime);
        if (filters.startDate && entryStart < filters.startDate) return false;
        if (filters.endDate && entryStart > filters.endDate) return false;
        return true;
      });
    }
    
    if (callback) {
      callback(entries);
    }
  });
};

/**
 * Расчет общей длительности по задаче
 */
export const calculateTaskTotalDuration = async (
  userId: string,
  taskId: string
): Promise<number> => {
  const entriesPath = `users/${userId}/timeEntries`;
  const q = query(
    collection(db, entriesPath),
    where('taskId', '==', taskId),
    where('status', 'in', ['completed', 'approved'])
  );
  
  const snapshot = await getDocs(q);
  let totalMinutes = 0;
  
  snapshot.docs.forEach(doc => {
    const entry = doc.data() as TimeEntry;
    if (entry.duration) {
      totalMinutes += entry.duration;
    }
  });
  
  return totalMinutes;
};

/**
 * Утверждение сессий работы руководителем
 */
export const approveTimeEntries = async (
  userId: string,
  entryIds: string[]
): Promise<void> => {
  const updates: Partial<TimeEntry> = {
    status: 'approved',
    updatedAt: serverTimestamp()
  };
  
  const updatePromises = entryIds.map(entryId => 
    updateDoc(doc(db, `users/${userId}/timeEntries`, entryId), updates)
  );
  
  await Promise.all(updatePromises);
};

/**
 * Удаление сессии работы
 */
export const deleteTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  await deleteDoc(entryRef);
};
