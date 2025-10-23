/**
 * ============================================================================
 * TASK TIME INTEGRATION - ИНТЕГРАЦИЯ ЗАДАЧ И УЧЕТА ВРЕМЕНИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Мостик между системой постановки задач (AssignmentTask) и учетом времени (TimeEntry).
 * Обеспечивает автоматическую синхронизацию статусов и времени между системами.
 * 
 * КЛЮЧЕВЫЕ ФУНКЦИИ:
 * ═════════════════════
 * 
 * 🔄 СИНХРОНИЗАЦИЯ СТАТУСОВ:
 * ├─ TimeEntry.status ↔ AssignmentTask.status
 * ├─ Автоматическое обновление при изменениях
 * ├─ Обработка ошибок и конфликтов
 * └─ Двусторонняя синхронизация
 * 
 * ⏱️ АВТОМАТИЧЕСКИЙ ПЕРЕСЧЕТ:
 * ├─ totalActiveDuration из TimeEntry → AssignmentTask
 * ├─ totalPauseDuration агрегация
 * ├─ Real-time обновления через Firestore
 * └─ Валидация и коррекция данных
 * 
 * 🎯 ЖИЗНЕННЫЙ ЦИКЛ:
 * ├─ startAssignmentTask → создание TimeEntry
 * ├─ pauseAssignmentTask → пауза TimeEntry
 * ├─ resumeAssignmentTask → возобновление TimeEntry
 * └─ completeAssignmentTask → завершение TimeEntry
 * 
 * 📊 АНАЛИТИКА И ОТЧЕТЫ:
 * ├─ Агрегация времени по задачам
 * ├─ Статистика эффективности
 * ├─ Прогнозирование сроков
 * └─ Отчеты для руководителей
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Интеграция времени и задач V2
 * ============================================================================
 */

import {
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  AssignmentTask, 
  AssignmentTaskStatus, 
  ASSIGNMENT_TASK_STATUS 
} from '../types/taskAssignment';
import { 
  TimeEntry, 
  TimeEntryStatus, 
  calculateActiveDuration,
  createTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  completeTimeEntry,
  StartMethod
} from './timeEntryUnified';
import { getAssignmentTask, updateAssignmentTask } from './taskAssignmentApi';

// ==================== ТИПЫ ====================

/**
 * Результат синхронизации
 */
export interface SyncResult {
  success: boolean;
  updated: string[];       // Список обновленных сущностей
  errors: string[];        // Ошибки синхронизации
  timestamp: Date;         // Время синхронизации
}

/**
 * Статистика времени по задаче
 */
export interface TaskTimeStatistics {
  taskId: string;
  totalEntries: number;
  totalActiveDuration: number;    // Общее активное время (минуты)
  totalPauseDuration: number;     // Общее время пауз (минуты)
  totalDuration: number;          // Общее время включая паузы
  averageSessionDuration: number; // Средняя длительность сессии
  longestSession: number;         // Самая длинная сессия
  shortestSession: number;        // Самая короткая сессия
  efficiencyRatio: number;        // Коэффициент эффективности (active/total)
  lastWorkDate: Date;            // Последний день работы
  workDays: number;              // Количество дней работы
}

/**
 * Маппинг статусов между системами
 */
const TASK_TO_TIME_STATUS_MAP: Record<AssignmentTaskStatus, TimeEntryStatus | null> = {
  'assigned': null,              // Нет TimeEntry
  'acknowledged': null,          // Нет TimeEntry
  'started': 'active',          // Начата работа
  'in_progress': 'active',      // Активная работа
  'paused': 'paused',           // Пауза
  'completed': 'completed',     // Завершена
  'verified': 'completed',      // Проверена (время завершено)
  'approved': 'approved',       // Одобрена
  'rejected': 'completed',      // Отклонена (время завершено)
};

const TIME_TO_TASK_STATUS_MAP: Record<TimeEntryStatus, AssignmentTaskStatus> = {
  'active': 'in_progress',      // Активное время → в работе
  'paused': 'paused',           // Пауза → пауза
  'completed': 'completed',     // Завершено → завершена
  'approved': 'approved',       // Одобрено → одобрена
  'pending_approval': 'verified', // Ожидает одобрения → проверена
};

// ==================== УТИЛИТЫ ====================

/**
 * Получение всех записей времени по задаче
 */
const getTimeEntriesForTask = async (
  userId: string, 
  assignmentTaskId: string
): Promise<TimeEntry[]> => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('assignmentTaskId', '==', assignmentTaskId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];
};

/**
 * Очистка данных для Firestore (убираем undefined)
 */
const cleanForFirestore = (data: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// ==================== СИНХРОНИЗАЦИЯ СТАТУСОВ ====================

/**
 * Синхронизация статуса задачи с записью времени
 */
export const syncTaskStatusWithTimeEntry = async (
  assignmentTaskId: string,
  newStatus: AssignmentTaskStatus,
  userId: string
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    updated: [],
    errors: [],
    timestamp: new Date(),
  };

  try {
    // Получаем задачу
    const task = await getAssignmentTask(assignmentTaskId);
    if (!task) {
      result.errors.push('Задача не найдена');
      return result;
    }

    // Получаем активную запись времени
    if (task.currentTimeEntryId) {
      const timeEntryStatus = TASK_TO_TIME_STATUS_MAP[newStatus];
      
      if (timeEntryStatus) {
        const timeEntryRef = doc(db, `users/${userId}/timeEntries`, task.currentTimeEntryId);
        await updateDoc(timeEntryRef, cleanForFirestore({
          status: timeEntryStatus,
          updatedAt: serverTimestamp(),
        }));
        
        result.updated.push(`TimeEntry:${task.currentTimeEntryId}`);
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка');
    return result;
  }
};

/**
 * Синхронизация статуса записи времени с задачей
 */
export const syncTimeEntryStatusWithTask = async (
  timeEntryId: string,
  newStatus: TimeEntryStatus,
  userId: string
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    updated: [],
    errors: [],
    timestamp: new Date(),
  };

  try {
    // Получаем запись времени
    const timeEntryRef = doc(db, `users/${userId}/timeEntries`, timeEntryId);
    const timeEntryDoc = await getDoc(timeEntryRef);
    
    if (!timeEntryDoc.exists()) {
      result.errors.push('Запись времени не найдена');
      return result;
    }

    const timeEntry = timeEntryDoc.data() as TimeEntry;
    
    // Если есть связанная задача постановки
    if (timeEntry.assignmentTaskId) {
      const taskStatus = TIME_TO_TASK_STATUS_MAP[newStatus];
      
      if (taskStatus) {
        await updateAssignmentTask(timeEntry.assignmentTaskId, {
          status: taskStatus,
        });
        
        result.updated.push(`AssignmentTask:${timeEntry.assignmentTaskId}`);
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка');
    return result;
  }
};

// ==================== АВТОМАТИЧЕСКИЙ ПЕРЕСЧЕТ ВРЕМЕНИ ====================

/**
 * Пересчет времени в задаче на основе записей времени
 */
export const recalculateTaskTime = async (
  assignmentTaskId: string,
  userId: string
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    updated: [],
    errors: [],
    timestamp: new Date(),
  };

  try {
    // Получаем все записи времени по задаче
    const timeEntries = await getTimeEntriesForTask(userId, assignmentTaskId);
    
    if (timeEntries.length === 0) {
      result.success = true;
      return result;
    }

    // Агрегируем время
    let totalActiveDuration = 0;
    let totalPauseDuration = 0;
    let totalDuration = 0;

    timeEntries.forEach(entry => {
      if (entry.activeDuration) {
        totalActiveDuration += entry.activeDuration;
      }
      if (entry.totalPauseDuration) {
        totalPauseDuration += entry.totalPauseDuration;
      }
      if (entry.totalDuration) {
        totalDuration += entry.totalDuration;
      }
    });

    // Обновляем задачу
    await updateAssignmentTask(assignmentTaskId, {
      totalActiveDuration,
      totalPauseDuration,
      timeEntries: timeEntries.map(entry => entry.id),
    });

    result.updated.push(`AssignmentTask:${assignmentTaskId}`);
    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Ошибка пересчета времени');
    return result;
  }
};

/**
 * Автоматический пересчет времени при изменении записи времени
 */
export const autoRecalculateOnTimeEntryChange = async (
  timeEntry: TimeEntry,
  userId: string
): Promise<void> => {
  if (timeEntry.assignmentTaskId) {
    await recalculateTaskTime(timeEntry.assignmentTaskId, userId);
  }
};

// ==================== ИНТЕГРАЦИЯ С WORKFLOW ====================

/**
 * Создание записи времени при старте задачи
 */
export const createTimeEntryForAssignmentTask = async (
  assignmentTask: AssignmentTask,
  startData: {
    location?: any;
    photoUrl?: string;
    startMethod?: import('./timeEntryUnified').StartMethod;
  } = {}
): Promise<string> => {
  const timeEntryData = {
    taskId: assignmentTask.id,
    userId: assignmentTask.assignedTo,
    projectId: assignmentTask.projectId,
    estimateId: assignmentTask.estimateId,
    
    // Интеграция с AssignmentTask
    assignmentTaskId: assignmentTask.id,
    taskType: 'assignment' as const,
    autoCreatedFromAssignment: true,
    taskName: assignmentTask.title,
    projectName: assignmentTask.projectName,
    
    // Данные старта
    startLocation: startData.location,
    startPhotoUrl: startData.photoUrl,
    startMethod: (startData.startMethod as StartMethod) || 'manual',
  };

  return await createTimeEntry(assignmentTask.assignedTo, timeEntryData);
};

/**
 * Пауза записи времени при паузе задачи
 */
export const pauseTimeEntryForAssignmentTask = async (
  assignmentTask: AssignmentTask,
  reason?: string
): Promise<void> => {
  if (assignmentTask.currentTimeEntryId) {
    await pauseTimeEntry(assignmentTask.assignedTo, assignmentTask.currentTimeEntryId, reason);
  }
};

/**
 * Возобновление записи времени при возобновлении задачи
 */
export const resumeTimeEntryForAssignmentTask = async (
  assignmentTask: AssignmentTask
): Promise<void> => {
  if (assignmentTask.currentTimeEntryId) {
    await resumeTimeEntry(assignmentTask.assignedTo, assignmentTask.currentTimeEntryId);
  }
};

/**
 * Завершение записи времени при завершении задачи
 */
export const completeTimeEntryForAssignmentTask = async (
  assignmentTask: AssignmentTask,
  endData: {
    location?: any;
    photoUrl?: string;
    comment?: string;
  } = {}
): Promise<void> => {
  if (assignmentTask.currentTimeEntryId) {
    await completeTimeEntry(
      assignmentTask.currentTimeEntryId,
      endData.location,
      endData.photoUrl,
      endData.comment
    );
  }
};

// ==================== СТАТИСТИКА И АНАЛИТИКА ====================

/**
 * Получение статистики времени по задаче
 */
export const getTaskTimeStatistics = async (
  assignmentTaskId: string,
  userId: string
): Promise<TaskTimeStatistics> => {
  const timeEntries = await getTimeEntriesForTask(userId, assignmentTaskId);
  
  if (timeEntries.length === 0) {
    return {
      taskId: assignmentTaskId,
      totalEntries: 0,
      totalActiveDuration: 0,
      totalPauseDuration: 0,
      totalDuration: 0,
      averageSessionDuration: 0,
      longestSession: 0,
      shortestSession: 0,
      efficiencyRatio: 0,
      lastWorkDate: new Date(),
      workDays: 0,
    };
  }

  // Агрегируем данные
  let totalActiveDuration = 0;
  let totalPauseDuration = 0;
  let totalDuration = 0;
  let longestSession = 0;
  let shortestSession = Infinity;
  
  const workDates = new Set<string>();

  timeEntries.forEach(entry => {
    const activeDuration = entry.activeDuration || 0;
    const pauseDuration = entry.totalPauseDuration || 0;
    const duration = entry.totalDuration || 0;

    totalActiveDuration += activeDuration;
    totalPauseDuration += pauseDuration;
    totalDuration += duration;

    if (activeDuration > longestSession) {
      longestSession = activeDuration;
    }
    if (activeDuration < shortestSession && activeDuration > 0) {
      shortestSession = activeDuration;
    }

    // Добавляем дату работы
    const workDate = entry.startTime.toISOString().split('T')[0];
    workDates.add(workDate);
  });

  const averageSessionDuration = totalActiveDuration / timeEntries.length;
  const efficiencyRatio = totalDuration > 0 ? totalActiveDuration / totalDuration : 0;
  const lastWorkDate = new Date(Math.max(...timeEntries.map(entry => entry.startTime.getTime())));
  
  return {
    taskId: assignmentTaskId,
    totalEntries: timeEntries.length,
    totalActiveDuration,
    totalPauseDuration,
    totalDuration,
    averageSessionDuration,
    longestSession,
    shortestSession: shortestSession === Infinity ? 0 : shortestSession,
    efficiencyRatio,
    lastWorkDate,
    workDays: workDates.size,
  };
};

// ==================== REAL-TIME СИНХРОНИЗАЦИЯ ====================

/**
 * Подписка на изменения записей времени для автоматического пересчета
 */
export const subscribeToTimeEntryChangesForTask = (
  userId: string,
  assignmentTaskId: string,
  callback: (statistics: TaskTimeStatistics) => void
) => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('assignmentTaskId', '==', assignmentTaskId)
  );

  return onSnapshot(q, async (snapshot) => {
    // Автоматически пересчитываем время при изменениях
    await recalculateTaskTime(assignmentTaskId, userId);
    
    // Получаем обновленную статистику
    const statistics = await getTaskTimeStatistics(assignmentTaskId, userId);
    callback(statistics);
  });
};

/**
 * Валидация целостности данных между задачами и временем
 */
export const validateTaskTimeIntegrity = async (
  assignmentTaskId: string,
  userId: string
): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Получаем задачу
    const task = await getAssignmentTask(assignmentTaskId);
    if (!task) {
      issues.push('Задача не найдена');
      return { isValid: false, issues, recommendations };
    }

    // Получаем записи времени
    const timeEntries = await getTimeEntriesForTask(userId, assignmentTaskId);
    
    // Проверяем соответствие времени в задаче и записях
    const calculatedActiveDuration = timeEntries.reduce((sum, entry) => 
      sum + (entry.activeDuration || 0), 0);
    
    if (Math.abs(task.totalActiveDuration - calculatedActiveDuration) > 1) {
      issues.push(`Время в задаче (${task.totalActiveDuration} мин) не соответствует записям времени (${calculatedActiveDuration} мин)`);
      recommendations.push('Выполните пересчет времени задачи');
    }

    // Проверяем статусы
    if (task.currentTimeEntryId) {
      const activeEntry = timeEntries.find(entry => entry.id === task.currentTimeEntryId);
      if (!activeEntry) {
        issues.push('Активная запись времени не найдена');
        recommendations.push('Очистите поле currentTimeEntryId в задаче');
      } else if (activeEntry.status !== 'active' && task.status === 'in_progress') {
        issues.push('Статус задачи не соответствует статусу записи времени');
        recommendations.push('Синхронизируйте статусы задачи и времени');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  } catch (error) {
    issues.push(`Ошибка валидации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    return { isValid: false, issues, recommendations };
  }
};

// ==================== ЭКСПОРТ ====================

export default {
  // Синхронизация статусов
  syncTaskStatusWithTimeEntry,
  syncTimeEntryStatusWithTask,
  
  // Пересчет времени
  recalculateTaskTime,
  autoRecalculateOnTimeEntryChange,
  
  // Интеграция с workflow
  createTimeEntryForAssignmentTask,
  pauseTimeEntryForAssignmentTask,
  resumeTimeEntryForAssignmentTask,
  completeTimeEntryForAssignmentTask,
  
  // Статистика
  getTaskTimeStatistics,
  
  // Real-time
  subscribeToTimeEntryChangesForTask,
  
  // Валидация
  validateTaskTimeIntegrity,
};