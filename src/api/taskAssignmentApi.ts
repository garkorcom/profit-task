/**
 * ============================================================================
 * TASK ASSIGNMENT API - API ДЛЯ СИСТЕМЫ ПОСТАНОВКИ ЗАДАЧ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Полный CRUD API для системы постановки задач сотрудникам с:
 * • Интеграцией с timeEntryUnified.ts
 * • Real-time подписками через Firestore
 * • Автоматическими уведомлениями
 * • Валидацией прав доступа
 * • Optimistic updates
 * 
 * СТРУКТУРА КОЛЛЕКЦИИ:
 * ═══════════════════════
 * 
 * /assignmentTasks/{taskId}
 * ├─ /comments/{commentId}          // Подколлекция комментариев
 * ├─ /timeEntries/{entryId}         // Связанные записи времени
 * └─ /photos/{photoId}              // Фотофиксация
 * 
 * ИНТЕГРАЦИЯ:
 * ═══════════
 * • timeEntryUnified.ts - учет времени
 * • userApi.ts - получение данных пользователей
 * • projectApi.ts - валидация проектов
 * • Firebase Storage - загрузка фото
 * • Cloud Functions - Telegram уведомления
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Система постановки задач API
 * ============================================================================
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  Timestamp,
  QuerySnapshot,
  DocumentSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  startAfter,
  endBefore,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase/firebase';
import { 
  AssignmentTask, 
  AssignmentTaskComment, 
  CreateAssignmentTaskDto, 
  UpdateAssignmentTaskDto, 
  AssignmentTaskFilters, 
  AssignmentTaskSortOptions, 
  AssignmentTaskStatistics, 
  AssignmentTaskOperationResult,
  AssignmentTaskStatus,
  ASSIGNMENT_TASK_STATUS,
  GeoPoint,
} from '../types/taskAssignment';
import { 
  createTimeEntry, 
  pauseTimeEntry, 
  resumeTimeEntry, 
  completeTimeEntry,
  switchWork,
} from './timeEntryUnified';
import {
  createTimeEntryForAssignmentTask,
  pauseTimeEntryForAssignmentTask,
  resumeTimeEntryForAssignmentTask,
  completeTimeEntryForAssignmentTask,
  recalculateTaskTime,
  syncTaskStatusWithTimeEntry,
} from './taskTimeIntegration';
import { getUserProfile } from './userApi';

// ==================== КОНСТАНТЫ ====================

const COLLECTION_NAME = 'assignmentTasks';
const COMMENTS_SUBCOLLECTION = 'comments';

// ==================== УТИЛИТЫ ====================

/**
 * Конвертация Firebase Timestamp в Date
 */
const convertTimestamp = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

/**
 * Очистка данных для Firestore (убираем undefined)
 */
const cleanForFirestore = (data: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

/**
 * Получение текущего пользователя
 */
const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Пользователь не авторизован');
  }
  return user;
};

// ==================== СОЗДАНИЕ ЗАДАЧ ====================

/**
 * Создание новой задачи (для менеджеров)
 */
export const createAssignmentTask = async (taskData: CreateAssignmentTaskDto): Promise<string> => {
  const currentUser = getCurrentUser();
  
  // Получаем данные исполнителя для кэширования
  const assigneeProfile = await getUserProfile(taskData.assignedTo);
  const assignedByProfile = await getUserProfile(currentUser.uid);
  
  if (!assigneeProfile) {
    throw new Error('Исполнитель не найден');
  }

  const now = serverTimestamp();
  
  const taskDoc: Omit<AssignmentTask, 'id'> = {
    // Идентификация
    projectId: taskData.projectId,
    estimateId: taskData.estimateId,
    estimateItemId: taskData.estimateItemId,
    
    // Назначение
    assignedTo: taskData.assignedTo,
    assignedBy: currentUser.uid,
    assignedAt: now,
    
    // Основные данные
    title: taskData.title,
    description: taskData.description || '',
    priority: taskData.priority,
    
    // Временные рамки
    dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : undefined,
    estimatedDuration: taskData.estimatedDuration || 0,
    
    // Статус и прогресс
    status: ASSIGNMENT_TASK_STATUS.ASSIGNED,
    
    // Учет времени
    timeEntries: [],
    totalActiveDuration: 0,
    totalPauseDuration: 0,
    
    // Геолокация
    locationRequired: taskData.locationRequired || false,
    workLocation: undefined, // TODO: Convert string to GeoPoint if needed
    
    // Фотофиксация
    photosRequired: taskData.photosRequired || false,
    startPhotos: [],
    completionPhotos: [],
    
    // Переписка
    comments: [],
    unreadCount: 0,
    
    // Уведомления
    telegramNotifications: taskData.telegramNotifications !== false, // По умолчанию включены
    remindersSent: 0,
    
    // Дополнительные поля
    tags: taskData.tags || [],
    requirements: taskData.requirements || [],
    
    // Метаданные
    createdAt: now,
    updatedAt: now,
    
    // Кэшированные данные
    assigneeName: assigneeProfile.displayName || assigneeProfile.email,
    assignedByName: assignedByProfile?.displayName || assignedByProfile?.email || 'Неизвестно',
  };

  const cleanedTask = cleanForFirestore(taskDoc);
  const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedTask);
  
  // TODO: Отправить Telegram уведомление
  // await notifyTaskAssigned(docRef.id, taskData.assignedTo);
  
  return docRef.id;
};

// ==================== ПОЛУЧЕНИЕ ЗАДАЧ ====================

/**
 * Получение задач пользователя
 */
export const getMyAssignmentTasks = async (
  userId: string, 
  filters?: AssignmentTaskFilters
): Promise<AssignmentTask[]> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('assignedTo', '==', userId),
    orderBy('createdAt', 'desc')
  );

  // Применяем фильтры
  if (filters) {
    if (filters.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }
    if (filters.priority && filters.priority.length > 0) {
      q = query(q, where('priority', 'in', filters.priority));
    }
    if (filters.projectId) {
      q = query(q, where('projectId', '==', filters.projectId));
    }
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AssignmentTask[];
};

/**
 * Получение задач по проекту
 */
export const getAssignmentTasksByProject = async (projectId: string): Promise<AssignmentTask[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AssignmentTask[];
};

/**
 * Получение конкретной задачи
 */
export const getAssignmentTask = async (taskId: string): Promise<AssignmentTask | null> => {
  const docRef = doc(db, COLLECTION_NAME, taskId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as AssignmentTask;
  }
  
  return null;
};

// ==================== ПОДПИСКИ (REAL-TIME) ====================

/**
 * Подписка на задачи пользователя
 */
export const subscribeToMyAssignmentTasks = (
  userId: string,
  callback: (tasks: AssignmentTask[]) => void,
  filters?: AssignmentTaskFilters
) => {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('assignedTo', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AssignmentTask[];
    
    callback(tasks);
  });
};

/**
 * Подписка на конкретную задачу
 */
export const subscribeToAssignmentTask = (
  taskId: string,
  callback: (task: AssignmentTask | null) => void
) => {
  const docRef = doc(db, COLLECTION_NAME, taskId);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data()
      } as AssignmentTask);
    } else {
      callback(null);
    }
  });
};

// ==================== ДЕЙСТВИЯ СОТРУДНИКА ====================

/**
 * Принять задачу (acknowledge)
 */
export const acknowledgeAssignmentTask = async (taskId: string): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.ACKNOWLEDGED,
      acknowledgedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    // TODO: Уведомить назначившего
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при принятии задачи' 
    };
  }
};

/**
 * Приступить к работе (start)
 */
export const startAssignmentTask = async (
  taskId: string, 
  location?: GeoPoint, 
  photoUrl?: string
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    
    return await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      const taskDoc = await transaction.get(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error('Задача не найдена');
      }
      
      const taskData = taskDoc.data() as AssignmentTask;
      
      // Проверяем права
      if (taskData.assignedTo !== currentUser.uid) {
        throw new Error('У вас нет прав на выполнение этой задачи');
      }
      
      // Проверяем статус
      if (taskData.status !== ASSIGNMENT_TASK_STATUS.ACKNOWLEDGED) {
        throw new Error('Задача должна быть сначала принята');
      }
      
      // Создаем запись времени через интеграцию
      const timeEntryId = await createTimeEntryForAssignmentTask(taskData, {
        location,
        photoUrl,
        startMethod: 'manual',
      });
      
      // Обновляем задачу
      const updates = cleanForFirestore({
        status: ASSIGNMENT_TASK_STATUS.IN_PROGRESS,
        startedAt: serverTimestamp(),
        currentTimeEntryId: timeEntryId,
        startLocation: location,
        startPhotos: photoUrl ? arrayUnion(photoUrl) : undefined,
        updatedAt: serverTimestamp(),
      });

      transaction.update(taskRef, updates);
      
      return { success: true, taskId, data: { timeEntryId } };
    });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при запуске задачи' 
    };
  }
};

/**
 * Приостановить работу (pause)
 */
export const pauseAssignmentTask = async (
  taskId: string, 
  reason?: string
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Задача не найдена');
    }
    
    const taskData = taskDoc.data() as AssignmentTask;
    
    // Приостанавливаем запись времени через интеграцию
    await pauseTimeEntryForAssignmentTask(taskData, reason);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.PAUSED,
      pauseReason: reason,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при приостановке задачи' 
    };
  }
};

/**
 * Возобновить работу (resume)
 */
export const resumeAssignmentTask = async (taskId: string): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Задача не найдена');
    }
    
    const taskData = taskDoc.data() as AssignmentTask;
    
    // Возобновляем запись времени через интеграцию
    await resumeTimeEntryForAssignmentTask(taskData);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.IN_PROGRESS,
      pauseReason: null,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при возобновлении задачи' 
    };
  }
};

/**
 * Завершить работу (complete)
 */
export const completeAssignmentTask = async (
  taskId: string, 
  location?: GeoPoint,
  photos?: string[]
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    
    return await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      const taskDoc = await transaction.get(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error('Задача не найдена');
      }
      
      const taskData = taskDoc.data() as AssignmentTask;
      let timeEntryData: any = null;
      
      // Завершаем текущую запись времени через интеграцию
      await completeTimeEntryForAssignmentTask(taskData, {
        location,
        photoUrl: photos?.[0],
        comment: 'Задача завершена',
      });
      
      // Пересчитываем время после завершения
      await recalculateTaskTime(taskId, currentUser.uid);
      
      // Обновляем задачу
      const updates = cleanForFirestore({
        status: ASSIGNMENT_TASK_STATUS.COMPLETED,
        completedAt: serverTimestamp(),
        endLocation: location,
        completionPhotos: photos || [],
        currentTimeEntryId: null,
        // Время будет обновлено автоматически через recalculateTaskTime
        updatedAt: serverTimestamp(),
      });

      transaction.update(taskRef, updates);
      
      // TODO: Уведомить назначившего о завершении
      
      return { success: true, taskId };
    });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при завершении задачи' 
    };
  }
};

// ==================== ДЕЙСТВИЯ РУКОВОДИТЕЛЯ ====================

/**
 * Проверить задачу (verify)
 */
export const verifyAssignmentTask = async (
  taskId: string, 
  comment?: string
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.VERIFIED,
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    // Добавляем комментарий если есть
    if (comment) {
      await addAssignmentTaskComment(taskId, comment);
    }
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при проверке задачи' 
    };
  }
};

/**
 * Одобрить задачу (approve)
 */
export const approveAssignmentTask = async (
  taskId: string, 
  comment?: string
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.APPROVED,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    // Добавляем комментарий если есть
    if (comment) {
      await addAssignmentTaskComment(taskId, comment);
    }
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при одобрении задачи' 
    };
  }
};

/**
 * Отклонить задачу (reject)
 */
export const rejectAssignmentTask = async (
  taskId: string, 
  reason: string
): Promise<AssignmentTaskOperationResult> => {
  try {
    const currentUser = getCurrentUser();
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const updates = cleanForFirestore({
      status: ASSIGNMENT_TASK_STATUS.REJECTED,
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, updates);
    
    // Добавляем комментарий с причиной
    await addAssignmentTaskComment(taskId, `Задача отклонена: ${reason}`);
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при отклонении задачи' 
    };
  }
};

// ==================== КОММЕНТАРИИ ====================

/**
 * Добавить комментарий к задаче
 */
export const addAssignmentTaskComment = async (
  taskId: string, 
  text: string, 
  photos?: string[]
): Promise<string> => {
  const currentUser = getCurrentUser();
  const userProfile = await getUserProfile(currentUser.uid);
  
  const comment: Omit<AssignmentTaskComment, 'id'> = {
    taskId,
    userId: currentUser.uid,
    userName: userProfile?.displayName || userProfile?.email || 'Неизвестно',
    userRole: userProfile?.role,
    text,
    timestamp: serverTimestamp(),
    read: false,
    photos: photos || [],
  };

  const cleanedComment = cleanForFirestore(comment);
  const docRef = await addDoc(
    collection(db, COLLECTION_NAME, taskId, COMMENTS_SUBCOLLECTION), 
    cleanedComment
  );
  
  // Обновляем счетчик непрочитанных
  const taskRef = doc(db, COLLECTION_NAME, taskId);
  await updateDoc(taskRef, {
    unreadCount: increment(1),
    lastCommentAt: serverTimestamp(),
    lastCommentBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
};

/**
 * Получить комментарии задачи
 */
export const getAssignmentTaskComments = async (taskId: string): Promise<AssignmentTaskComment[]> => {
  const q = query(
    collection(db, COLLECTION_NAME, taskId, COMMENTS_SUBCOLLECTION),
    orderBy('timestamp', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AssignmentTaskComment[];
};

/**
 * Подписка на комментарии задачи
 */
export const subscribeToAssignmentTaskComments = (
  taskId: string,
  callback: (comments: AssignmentTaskComment[]) => void
) => {
  const q = query(
    collection(db, COLLECTION_NAME, taskId, COMMENTS_SUBCOLLECTION),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AssignmentTaskComment[];
    
    callback(comments);
  });
};

/**
 * Отметить комментарии как прочитанные
 */
export const markAssignmentTaskCommentsAsRead = async (taskId: string, userId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Получаем непрочитанные комментарии
  const q = query(
    collection(db, COLLECTION_NAME, taskId, COMMENTS_SUBCOLLECTION),
    where('read', '==', false),
    where('userId', '!=', userId) // Не помечаем свои комментарии
  );

  const snapshot = await getDocs(q);
  let unreadCount = 0;
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
    unreadCount++;
  });
  
  // Обновляем счетчик в задаче
  if (unreadCount > 0) {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    batch.update(taskRef, {
      unreadCount: increment(-unreadCount),
    });
  }
  
  await batch.commit();
};

// ==================== ФАЙЛЫ И ФОТО ====================

/**
 * Загрузка фото для задачи
 */
export const uploadTaskPhoto = async (
  taskId: string, 
  file: File, 
  type: 'start' | 'completion' | 'comment'
): Promise<string> => {
  const currentUser = getCurrentUser();
  const fileName = `tasks/${taskId}/${type}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

// ==================== СТАТИСТИКА ====================

/**
 * Получить статистику по задачам пользователя
 */
export const getAssignmentTaskStatistics = async (userId: string): Promise<AssignmentTaskStatistics> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('assignedTo', '==', userId)
  );

  const snapshot = await getDocs(q);
  const tasks = snapshot.docs.map(doc => doc.data()) as AssignmentTask[];
  
  const stats: AssignmentTaskStatistics = {
    total: tasks.length,
    byStatus: {
      assigned: 0,
      acknowledged: 0,
      started: 0,
      in_progress: 0,
      paused: 0,
      completed: 0,
      verified: 0,
      approved: 0,
      rejected: 0,
    },
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
    overdue: 0,
    completedToday: 0,
    averageCompletionTime: 0,
    totalTimeSpent: 0,
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let totalCompletionTime = 0;
  let completedCount = 0;
  
  tasks.forEach(task => {
    // Статистика по статусам
    stats.byStatus[task.status]++;
    
    // Статистика по приоритетам
    stats.byPriority[task.priority]++;
    
    // Просроченные
    if (task.dueDate && convertTimestamp(task.dueDate)! < new Date() && 
        !['completed', 'verified', 'approved'].includes(task.status)) {
      stats.overdue++;
    }
    
    // Завершенные сегодня
    if (task.completedAt && convertTimestamp(task.completedAt)! >= today) {
      stats.completedToday++;
    }
    
    // Время выполнения
    if (task.completedAt && task.startedAt) {
      const completionTime = convertTimestamp(task.completedAt)!.getTime() - 
                           convertTimestamp(task.startedAt)!.getTime();
      totalCompletionTime += completionTime;
      completedCount++;
    }
    
    // Общее время
    stats.totalTimeSpent += task.totalActiveDuration;
  });
  
  // Среднее время выполнения в минутах
  if (completedCount > 0) {
    stats.averageCompletionTime = Math.floor(totalCompletionTime / completedCount / 60000);
  }
  
  return stats;
};

// ==================== ОБНОВЛЕНИЕ И УДАЛЕНИЕ ====================

/**
 * Обновление задачи
 */
export const updateAssignmentTask = async (
  taskId: string, 
  updates: UpdateAssignmentTaskDto
): Promise<AssignmentTaskOperationResult> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(taskRef, cleanedUpdates);
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при обновлении задачи' 
    };
  }
};

/**
 * Удаление задачи
 */
export const deleteAssignmentTask = async (taskId: string): Promise<AssignmentTaskOperationResult> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
    
    return { success: true, taskId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка при удалении задачи' 
    };
  }
};

// ==================== ЭКСПОРТ ====================

export default {
  // Создание и получение
  createAssignmentTask,
  getMyAssignmentTasks,
  getAssignmentTasksByProject,
  getAssignmentTask,
  
  // Подписки
  subscribeToMyAssignmentTasks,
  subscribeToAssignmentTask,
  
  // Действия сотрудника
  acknowledgeAssignmentTask,
  startAssignmentTask,
  pauseAssignmentTask,
  resumeAssignmentTask,
  completeAssignmentTask,
  
  // Действия руководителя
  verifyAssignmentTask,
  approveAssignmentTask,
  rejectAssignmentTask,
  
  // Комментарии
  addAssignmentTaskComment,
  getAssignmentTaskComments,
  subscribeToAssignmentTaskComments,
  markAssignmentTaskCommentsAsRead,
  
  // Файлы
  uploadTaskPhoto,
  
  // Статистика
  getAssignmentTaskStatistics,
  
  // Обновление и удаление
  updateAssignmentTask,
  deleteAssignmentTask,
};