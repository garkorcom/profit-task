/**
 * Сервис для работы с эмоциональными логами
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { 
  EmotionLogEntry, 
  EmotionCheckInData, 
  EmotionDailyStats
} from '../types';
import { EMOTION_TAGS } from '../types/index';
import { isValidTimestamp, getDateRange, formatDateYYYYMMDD } from '../utils/dateHelpers';

const EMOTION_LOGS_COLLECTION = 'emotionLogs';
const EMOTION_STATS_COLLECTION = 'emotionDailyStats';

/**
 * Создание нового эмоционального лога с полной валидацией
 */
export const createEmotionLog = async (
  userId: string, 
  data: EmotionCheckInData,
  userTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<string> => {
  const timestamp = Date.now();
  
  // Валидация userId
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Invalid userId: must be non-empty string');
  }
  
  // Валидация временной метки
  if (!isValidTimestamp(timestamp)) {
    throw new Error('Invalid timestamp: must be within allowed time range');
  }
  
  // Валидация уровня эмоции
  if (!data.level || data.level < 1 || data.level > 5 || !Number.isInteger(data.level)) {
    throw new Error('Invalid emotion level: must be integer 1-5');
  }
  
  // Валидация тегов против словаря
  if (!data.tags || !Array.isArray(data.tags)) {
    throw new Error('Invalid tags: must be array');
  }
  
  // Проверка максимального количества тегов
  if (data.tags.length > 5) {
    throw new Error('Too many tags: maximum 5 allowed');
  }
  
  // Валидация тегов против словаря EMOTION_TAGS
  const validTagsForLevel = EMOTION_TAGS[data.level as keyof typeof EMOTION_TAGS] || [];
  const invalidTags = data.tags.filter(tag => !validTagsForLevel.includes(tag));
  if (invalidTags.length > 0) {
    throw new Error(`Invalid tags for level ${data.level}: ${invalidTags.join(', ')}. Valid tags: ${validTagsForLevel.join(', ')}`);
  }
  
  // Валидация длины тегов
  const oversizedTags = data.tags.filter(tag => typeof tag !== 'string' || tag.length > 50);
  if (oversizedTags.length > 0) {
    throw new Error('Tag too long: maximum 50 characters per tag');
  }
  
  // Валидация заметок
  if (data.notes && (typeof data.notes !== 'string' || data.notes.length > 1000)) {
    throw new Error('Notes too long: maximum 1000 characters');
  }
  
  // Валидация контекста
  if (!data.context || !data.context.type) {
    throw new Error('Invalid context: context.type is required');
  }
  
  const validContextTypes = ['timeEntry', 'task', 'project', 'event', 'manual'];
  if (!validContextTypes.includes(data.context.type)) {
    throw new Error(`Invalid context.type: must be one of ${validContextTypes.join(', ')}`);
  }
  
  // Валидация context.id если присутствует
  if (data.context.id && (typeof data.context.id !== 'string' || data.context.id.length > 100)) {
    throw new Error('Invalid context.id: must be string with max 100 characters');
  }
  
  const emotionLog: Omit<EmotionLogEntry, 'id'> = {
    userId,
    ts: timestamp,
    userTz,
    level: data.level,
    tags: data.tags,
    notes: data.notes,
    context: data.context,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  const docRef = await addDoc(collection(db, EMOTION_LOGS_COLLECTION), {
    ...emotionLog,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

/**
 * Обновление эмоционального лога
 */
export const updateEmotionLog = async (
  logId: string, 
  updates: Partial<Pick<EmotionLogEntry, 'level' | 'tags' | 'notes'>>
): Promise<void> => {
  const docRef = doc(db, EMOTION_LOGS_COLLECTION, logId);
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Удаление эмоционального лога
 */
export const deleteEmotionLog = async (logId: string): Promise<void> => {
  const docRef = doc(db, EMOTION_LOGS_COLLECTION, logId);
  await deleteDoc(docRef);
};

/**
 * Получение эмоциональных логов пользователя за период
 */
export const getEmotionLogs = async (
  userId: string, 
  days: number = 30
): Promise<EmotionLogEntry[]> => {
  const { start, end } = getDateRange(days);
  
  const q = query(
    collection(db, EMOTION_LOGS_COLLECTION),
    where('userId', '==', userId),
    where('ts', '>=', start),
    where('ts', '<=', end),
    orderBy('ts', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  const logs: EmotionLogEntry[] = [];
  
  querySnapshot.forEach((doc) => {
    logs.push({
      id: doc.id,
      ...doc.data()
    } as EmotionLogEntry);
  });
  
  return logs;
};

/**
 * Подписка на эмоциональные логи пользователя
 */
export const subscribeToEmotionLogs = (
  userId: string,
  days: number = 30,
  callback: (logs: EmotionLogEntry[]) => void
): Unsubscribe => {
  const { start, end } = getDateRange(days);
  
  const q = query(
    collection(db, EMOTION_LOGS_COLLECTION),
    where('userId', '==', userId),
    where('ts', '>=', start),
    where('ts', '<=', end),
    orderBy('ts', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const logs: EmotionLogEntry[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      } as EmotionLogEntry);
    });
    callback(logs);
  });
};

/**
 * Получение последних N эмоциональных логов
 */
export const getRecentEmotionLogs = async (
  userId: string, 
  limitCount: number = 10
): Promise<EmotionLogEntry[]> => {
  const q = query(
    collection(db, EMOTION_LOGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('ts', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  const logs: EmotionLogEntry[] = [];
  
  querySnapshot.forEach((doc) => {
    logs.push({
      id: doc.id,
      ...doc.data()
    } as EmotionLogEntry);
  });
  
  return logs;
};

/**
 * Получение дневной статистики
 */
export const getDailyStats = async (
  userId: string, 
  days: number = 30
): Promise<EmotionDailyStats[]> => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  
  const startDateStr = formatDateYYYYMMDD(startDate);
  const endDateStr = formatDateYYYYMMDD(endDate);
  
  const q = query(
    collection(db, EMOTION_STATS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', startDateStr),
    where('date', '<=', endDateStr),
    orderBy('date', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  const stats: EmotionDailyStats[] = [];
  
  querySnapshot.forEach((doc) => {
    stats.push({
      id: doc.id,
      ...doc.data()
    } as EmotionDailyStats);
  });
  
  return stats;
};

/**
 * Подписка на дневную статистику
 */
export const subscribeToDailyStats = (
  userId: string,
  days: number = 30,
  callback: (stats: EmotionDailyStats[]) => void
): Unsubscribe => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  
  const startDateStr = formatDateYYYYMMDD(startDate);
  const endDateStr = formatDateYYYYMMDD(endDate);
  
  const q = query(
    collection(db, EMOTION_STATS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', startDateStr),
    where('date', '<=', endDateStr),
    orderBy('date', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const stats: EmotionDailyStats[] = [];
    querySnapshot.forEach((doc) => {
      stats.push({
        id: doc.id,
        ...doc.data()
      } as EmotionDailyStats);
    });
    callback(stats);
  });
};

/**
 * Получение статистики по проектам/задачам
 */
export const getActivityEmotionStats = async (
  userId: string,
  contextType: 'project' | 'task',
  days: number = 30
): Promise<Array<{ id: string; name: string; avgLevel: number; count: number; }>> => {
  const { start, end } = getDateRange(days);
  
  const q = query(
    collection(db, EMOTION_LOGS_COLLECTION),
    where('userId', '==', userId),
    where('context.type', '==', contextType),
    where('ts', '>=', start),
    where('ts', '<=', end)
  );
  
  const querySnapshot = await getDocs(q);
  const activityStats = new Map<string, { total: number; count: number; }>();
  
  querySnapshot.forEach((doc) => {
    const log = doc.data() as EmotionLogEntry;
    const contextId = log.context.id;
    
    if (contextId) {
      const existing = activityStats.get(contextId) || { total: 0, count: 0 };
      existing.total += log.level;
      existing.count += 1;
      activityStats.set(contextId, existing);
    }
  });
  
  // Конвертируем в массив и добавляем названия (здесь нужна интеграция с основной системой)
  const results: Array<{ id: string; name: string; avgLevel: number; count: number; }> = [];
  
  activityStats.forEach((stats, id) => {
    results.push({
      id,
      name: `${contextType === 'project' ? 'Проект' : 'Задача'} ${id}`, // TODO: получать реальные названия
      avgLevel: Number((stats.total / stats.count).toFixed(2)),
      count: stats.count
    });
  });
  
  return results.sort((a, b) => b.avgLevel - a.avgLevel);
};

/**
 * Быстрая отметка эмоции с Optimistic Updates
 */
export class OptimisticEmotionService {
  private pendingOperations = new Map<string, NodeJS.Timeout>();
  
  /**
   * Создание лога с возможностью отмены
   */
  async createWithUndo(
    userId: string,
    data: EmotionCheckInData,
    undoTimeoutMs: number = 5000
  ): Promise<{ logId: string; undo: () => void }> {
    // Создаем лог
    const logId = await createEmotionLog(userId, data);
    
    let undoTimeout: NodeJS.Timeout | null = null;
    
    const undo = () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
      }
      
      // Удаляем лог
      deleteEmotionLog(logId).catch(console.error);
    };
    
    // Устанавливаем таймаут для автоматической очистки
    undoTimeout = setTimeout(() => {
      this.pendingOperations.delete(logId);
    }, undoTimeoutMs);
    
    this.pendingOperations.set(logId, undoTimeout);
    
    return { logId, undo };
  }
  
  /**
   * Очистка всех ожидающих операций
   */
  cleanup(): void {
    this.pendingOperations.forEach(timeout => clearTimeout(timeout));
    this.pendingOperations.clear();
  }
}

// Экспорт singleton экземпляра
export const optimisticEmotionService = new OptimisticEmotionService();