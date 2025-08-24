// Модуль работы с задачами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/tasks/{taskId}
// Здесь собраны функции для подписки на изменения и для операций создания/обновления/удаления задач.
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, limit } from 'firebase/firestore';

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'testing' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'task' | 'milestone' | 'bug' | 'feature' | 'epic';
export type TaskComplexity = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string;
  code: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  complexity?: TaskComplexity;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  deadline?: string;
  estimatedHours?: number;
  actualHours?: number;
  remainingHours?: number;
  progress?: number; // 0-100
  assigneeId?: string;
  assignees?: string[];
  reviewerId?: string;
  watchers?: string[];
  dependencies?: string[];
  blockedBy?: string[];
  blocks?: string[];
  attachments?: any[];
  checklistItems?: Record<string, boolean>;
  tags?: string[];
  customFields?: Record<string, any>;
  isRecurring?: boolean;
  recurringPattern?: any;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any;

  // Старые поля
  name?: string;
  projectName?: string;
  contractorId?: string;
  contractorName?: string;
}

/**
 * Подписка на список задач пользователя в реальном времени.
 * Возвращает функцию для отписки от стрима.
 *
 * Важно: используется orderBy('createdAt', 'desc'), поэтому при первом добавлении
 * нужно убедиться, что у документов есть поле createdAt (мы его выставляем serverTimestamp()).
 */
export const getTasksStream = (userId: string, callback: (tasks: Task[]) => void) => {
  const tasksPath = `users/${userId}/tasks`;
  const q = query(collection(db, tasksPath), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
    callback(tasks);
  });
};

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
  // Simplified query to avoid index requirements
  const q = query(
    collection(db, tasksPath),
    limit(100) // Get more tasks to filter client-side
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[])
      .filter(t => t.priority === 'high' && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        // Sort by createdAt client-side
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, limitCount);
    callback(tasks);
  });
};

/**
 * Создание задачи с автоматическими временными метками и дефолтным статусом.
 * Возвращает идентификатор созданного документа.
 */
export const addTask = async (userId: string, taskData: { 
  task: string; 
  description?: string; 
  priority?: string; 
  status?: string;
  contractorId?: string;
  contractorName?: string;
  questions?: string;
  whatToBuy?: string;
}) => {
  const tasksPath = `users/${userId}/tasks`;
  const taskWithTimestamp = {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: taskData.status || 'pending'
  };
  
  try {
    const docRef = await addDoc(collection(db, tasksPath), taskWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Ошибка при добавлении задачи:', error);
    throw error;
  }
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
 * Применение остатков к задаче (заглушка для будущей логики складского учёта).
 */
export const applyStockForTask = async (userId: string, taskId: string, stockData: any) => {
  // Здесь будет логика применения остатков к задаче
  console.log('Применение остатков к задаче:', { userId, taskId, stockData });
};