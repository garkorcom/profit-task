// Модуль работы с задачами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/tasks/{taskId}
// Здесь собраны функции для подписки на изменения и для операций создания/обновления/удаления задач.
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, limit, Unsubscribe, Query, DocumentData } from 'firebase/firestore';

// Статусы жизненного цикла задачи
export type TaskStatus = 
  | 'new'        // Новая - только создана
  | 'assigned'   // Назначена - исполнитель определен
  | 'in_progress' // В работе - активно выполняется
  | 'on_hold'    // Приостановлена - временно остановлена
  | 'review'     // На проверке - ожидает проверки руководителем
  | 'rework'     // На доработку - возвращена на исправление
  | 'completed'  // Выполнена - успешно завершена
  | 'cancelled'; // Отменена - больше не актуальна

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  task: string;  // Название задачи
  description?: string;  // Детальное описание
  
  // Жизненный цикл и приоритет
  status?: TaskStatus;
  priority?: TaskPriority;
  
  // Привязки
  projectId?: string;  // Привязка к проекту (обязательно для новых задач)
  projectName?: string;
  estimateItemId?: string;  // Привязка к позиции сметы (опционально)
  contractorId?: string;
  contractorName?: string;
  
  // Участники
  assigneeId?: string;  // ID исполнителя
  assigneeName?: string;
  authorId?: string;  // ID автора задачи
  authorName?: string;
  
  // Планирование
  deadline?: any;  // Срок выполнения
  plannedDuration?: number;  // Плановые трудозатраты в часах
  actualDuration?: number;  // Фактические трудозатраты (автоматически рассчитывается)
  
  // Фотофиксация
  requirePhoto?: boolean;  // Флаг обязательной фотофиксации
  photoSessions?: Array<{  // Массив фотосессий для множественных сессий работы
    sessionId: string;
    startPhotoUrl?: string;
    endPhotoUrl?: string;
    startTime?: any;
    endTime?: any;
  }>;
  
  // Геолокация
  startLocation?: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
  
  // Временные метки работы
  startedAt?: any;  // Когда впервые начата работа
  finishedAt?: any;  // Когда завершена работа
  reviewedAt?: any;  // Когда проверена руководителем
  
  // Дополнительные поля
  questions?: string;  // Вопросы и уточнения
  whatToBuy?: string;  // Список покупок
  holdReason?: string;  // Причина приостановки (для статуса on_hold)
  reworkReason?: string;  // Причина возврата на доработку
  reviewComment?: string;  // Комментарий руководителя при проверке
  
  // Зарезервированные товары
  reservedProducts?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }>;
  
  // Теги для дополнительной классификации
  tags?: string[];
  
  // Системные поля
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Получение потока задач в реальном времени
 * @param userId - ID пользователя
 * @param callback - функция обратного вызова для обновления списка задач
 * @param projectId - (опционально) ID проекта для фильтрации
 */
export const getTasksStream = (
  userId: string,
  callback: (tasks: Task[]) => void,
  projectId?: string
): Unsubscribe => {
  const tasksPath = `users/${userId}/tasks`;
  let q: Query<DocumentData>;

  if (projectId) {
    q = query(collection(db, tasksPath), where('projectId', '==', projectId));
  } else {
    q = query(collection(db, tasksPath));
  }

  return onSnapshot(q, (snapshot) => {
    console.log(`[taskApi] Snapshot received. Empty: ${snapshot.empty}. Size: ${snapshot.size}`);
    snapshot.docs.forEach(doc => {
      console.log(`[taskApi] Task data:`, doc.data());
    });
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
    callback(tasks);
  }, (error) => {
    console.error("[taskApi] Error fetching tasks:", error);
  });
};

/**
 * Подписка на задачи по проекту (client-side сортировка при необходимости)
 */
export const getTasksByProjectStream = (userId: string, projectId: string, callback: (tasks: Task[]) => void) => {
  const tasksPath = `users/${userId}/tasks`;
  const q = query(
    collection(db, tasksPath),
    where('projectId', '==', projectId)
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
    callback(tasks);
  });
};

/**
 * Подписка на задачи, отфильтрованные по конкретному контрагенту.
 * Требует составного индекса, если вместе с where используется orderBy(createdAt).
 */
export const getTasksByContractorStream = (userId: string, contractorId: string, callback: (tasks: Task[]) => void) => {
  const tasksPath = `users/${userId}/tasks`;
  const q = query(
    collection(db, tasksPath),
    where('contractorId', '==', contractorId)
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
    callback(tasks);
  });
};

/**
 * Получить поток задач с высоким приоритетом (ограниченный лимит)
 */
export const getHighPriorityTasksStream = (userId: string, limitCount: number = 5, callback: (tasks: Task[]) => void) => {
  const tasksPath = `users/${userId}/tasks`;
  const q = query(
    collection(db, tasksPath),
    where('priority', '==', 'high'),
    where('status', '!=', 'completed'),
    orderBy('status'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
    callback(tasks);
  });
};

/**
 * Создать новую задачу
 * @param userId - ID пользователя
 * @param taskData - Данные задачи (должны включать projectId)
 */
export const addTask = async (
  userId: string, 
  taskData: Omit<Task, 'id'>
): Promise<string> => {
  if (!taskData.projectId) {
    throw new Error('Task must have a projectId');
  }

  const tasksPath = `users/${userId}/tasks`;
  const docRef = await addDoc(collection(db, tasksPath), {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Частичное обновление полей задачи с выставлением updatedAt.
 * Важно: если обновляются зарезервированные товары (reservedProducts),
 * нужно также вызывать соответствующие функции из productApi для обновления резервов
 */
export const updateTask = async (userId: string, taskId: string, updates: Partial<Task>) => {
  const taskRef = doc(db, `users/${userId}/tasks`, taskId);
  const updatesWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  try {
    await updateDoc(taskRef, updatesWithTimestamp);
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    throw error;
  }
};

/**
 * Удаление задачи по её идентификатору.
 * Важно: перед удалением задачи нужно снять все резервы товаров,
 * связанные с этой задачей (через функции из productApi)
 */
export const deleteTask = async (userId: string, taskId: string) => {
  const taskRef = doc(db, `users/${userId}/tasks`, taskId);
  
  try {
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    throw error;
  }
};

/**
 * Изменение статуса задачи с проверкой валидности перехода
 */
export const changeTaskStatus = async (
  userId: string,
  taskId: string,
  newStatus: TaskStatus,
  additionalData?: {
    holdReason?: string;  // Для статуса on_hold
    reworkReason?: string;  // Для статуса rework
    reviewComment?: string;  // Для статуса review
    assigneeId?: string;  // Для статуса assigned
    assigneeName?: string;
  }
): Promise<void> => {
  const updates: Partial<Task> = {
    status: newStatus,
    ...additionalData,
    updatedAt: serverTimestamp()
  };
  
  // Добавляем временные метки для определенных статусов
  if (newStatus === 'in_progress' && !updates.startedAt) {
    updates.startedAt = serverTimestamp();
  } else if (newStatus === 'review') {
    updates.finishedAt = serverTimestamp();
  } else if (newStatus === 'completed') {
    updates.reviewedAt = serverTimestamp();
  }
  
  await updateTask(userId, taskId, updates);
};

/**
 * Назначение задачи исполнителю
 */
export const assignTask = async (
  userId: string,
  taskId: string,
  assigneeId: string,
  assigneeName: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'assigned', {
    assigneeId,
    assigneeName
  });
};

/**
 * Начало работы над задачей
 */
export const startTask = async (
  userId: string,
  taskId: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'in_progress');
};

/**
 * Приостановка задачи
 */
export const holdTask = async (
  userId: string,
  taskId: string,
  holdReason: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'on_hold', { holdReason });
};

/**
 * Отправка задачи на проверку
 */
export const submitTaskForReview = async (
  userId: string,
  taskId: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'review');
};

/**
 * Возврат задачи на доработку
 */
export const returnTaskForRework = async (
  userId: string,
  taskId: string,
  reworkReason: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'rework', { reworkReason });
};

/**
 * Утверждение задачи
 */
export const approveTask = async (
  userId: string,
  taskId: string,
  reviewComment?: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'completed', { reviewComment });
};

/**
 * Отмена задачи
 */
export const cancelTask = async (
  userId: string,
  taskId: string
): Promise<void> => {
  await changeTaskStatus(userId, taskId, 'cancelled');
};

/**
 * Проверка возможности перехода между статусами
 */
export const canTransitionStatus = (
  currentStatus: TaskStatus,
  newStatus: TaskStatus
): boolean => {
  const transitions: Record<TaskStatus, TaskStatus[]> = {
    'new': ['assigned', 'cancelled'],
    'assigned': ['in_progress', 'on_hold', 'cancelled'],
    'in_progress': ['on_hold', 'review'],
    'on_hold': ['in_progress', 'cancelled'],
    'review': ['completed', 'rework'],
    'rework': ['in_progress'],
    'completed': [],  // Нет переходов из completed
    'cancelled': []   // Нет переходов из cancelled
  };
  
  return transitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Применение остатков к задаче (заглушка для будущей логики складского учёта).
 */
export const applyStockForTask = async (userId: string, taskId: string, stockData: any) => {
  // Здесь будет логика применения остатков к задаче
  console.log('Применение остатков к задаче:', { userId, taskId, stockData });
};