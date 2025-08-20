// Модуль работы с задачами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/tasks/{taskId}
// Здесь собраны функции для подписки на изменения и для операций создания/обновления/удаления задач.
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';

export interface Task {
  id: string;
  task: string;
  description?: string;
  priority?: string;
  status?: string;
  contractorId?: string;
  contractorName?: string;
  questions?: string;  // Вопросы и уточнения по задаче
  whatToBuy?: string;  // Список покупок по задаче
  reservedProducts?: Array<{  // Товары, зарезервированные под задачу
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }>;
  createdAt?: any;
  updatedAt?: any;
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