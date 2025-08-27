/**
 * Улучшенная система учета времени с корректным расчетом пауз
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
  increment,
  writeBatch,
  deleteField // Импортируем deleteField
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getUserProfile } from './userApi'; // Импортируем функцию для получения профиля

export interface PauseRecord {
  startTime: Date;
  endTime?: Date;
  reason?: string;
  duration?: number; // в минутах
}

export interface EnhancedTimeEntry {
  // Основные временные метки
  startTime: Date;
  endTime?: Date;
  lastActiveTime?: Date; // Последнее время активности (для расчета при паузах)
  
  // Паузы
  pauses?: PauseRecord[];
  totalPauseDuration?: number; // Общее время пауз в минутах
  currentPauseStart?: Date; // Начало текущей паузы
  
  // Расчетные поля
  activeDuration?: number; // Активное время работы (без пауз) в минутах
  totalDuration?: number; // Общее время от начала до конца в минутах
}

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
 * Начало паузы с сохранением времени
 */
export const pauseTimeEntryEnhanced = async (
  userId: string,
  entryId: string,
  reason?: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentData = entryDoc.data();
  const now = new Date();
  
  // Сохраняем время начала паузы
  const updates = {
    status: 'paused',
    currentPauseStart: Timestamp.fromDate(now),
    lastActiveTime: Timestamp.fromDate(now),
    ...(reason && { pauseReason: reason }),
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
export const resumeTimeEntryEnhanced = async (
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
      reason: currentData.pauseReason
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
    currentPauseStart: deleteField(), // Корректно удаляем поле
    pauseReason: deleteField(),       // Корректно удаляем поле
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
 * Завершение работы с финальным расчетом времени и СЕБЕСТОИМОСТИ
 */
export const completeTimeEntryEnhanced = async (
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
    duration: activeDuration,
    totalDuration,
    activeDuration,
    totalPauseDuration: currentData.totalPauseDuration || 0,
    laborCost: laborCost > 0 ? laborCost : 0, // Сохраняем себестоимость
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
    // Путь к смете
    const estimateRef = doc(db, `users/${userId}/estimates`, currentData.estimateId);
    
    // Прямое обновление поля в элементе массива (сложно и неатомарно в Firestore)
    // Поэтому мы загрузим смету, обновим ее локально и запишем обратно.
    // Для более надежной работы в больших проектах это выносится в Cloud Function.
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
    laborCost: `${laborCost.toFixed(2)} ₽`
  });
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

export default {
  calculateActiveDuration,
  pauseTimeEntryEnhanced,
  resumeTimeEntryEnhanced,
  completeTimeEntryEnhanced,
  getTimeEntryStatistics,
  formatDuration,
  formatTimeHMS
};
