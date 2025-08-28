// Модуль работы с проектами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/projects/{projectId}
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, limit, getDocs } from 'firebase/firestore';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed';

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string; // ISO строка или краткий формат, для простоты UI
  endDate?: string;
  contractorId?: string;
  contractorName?: string;
  budget?: number;
  estimatesCount?: number; // Денормализованный счетчик смет
  createdAt?: any;
  updatedAt?: any;
}

// Поток проектов пользователя
export const getProjectsStream = (userId: string, callback: (projects: Project[]) => void) => {
  const projectsPath = `users/${userId}/projects`;
  const q = query(collection(db, projectsPath), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
    callback(projects);
  });
};

// Создание проекта
export const addProject = async (userId: string, projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  const projectsPath = `users/${userId}/projects`;
  const withTimestamps = {
    ...projectData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, projectsPath), withTimestamps);
  return ref.id;
};

// Обновление проекта с синхронизацией зависимых записей
export const updateProject = async (userId: string, projectId: string, updates: Partial<Project>) => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  
  // Если обновляется контрагент, нужно обновить его и в задачах
  if (updates.contractorId !== undefined || updates.contractorName !== undefined) {
    // Получаем все задачи проекта
    const tasksQuery = query(
      collection(db, `users/${userId}/tasks`),
      where('projectId', '==', projectId)
    );
    const taskSnapshot = await getDocs(tasksQuery);
    
    // Обновляем контрагента в каждой задаче
    const updatePromises = taskSnapshot.docs.map(taskDoc => {
      const taskRef = doc(db, `users/${userId}/tasks`, taskDoc.id);
      const taskUpdates: any = { updatedAt: serverTimestamp() };
      
      if (updates.contractorId !== undefined) {
        taskUpdates.contractorId = updates.contractorId;
      }
      if (updates.contractorName !== undefined) {
        taskUpdates.contractorName = updates.contractorName;
      }
      
      return updateDoc(taskRef, taskUpdates);
    });
    
    // Выполняем все обновления параллельно
    await Promise.all([
      updateDoc(projectRef, { ...updates, updatedAt: serverTimestamp() }),
      ...updatePromises
    ]);
  } else {
    // Обычное обновление проекта
    await updateDoc(projectRef, { ...updates, updatedAt: serverTimestamp() });
  }
};

// Удаление проекта с проверкой зависимостей
export const deleteProject = async (userId: string, projectId: string) => {
  // Проверяем наличие связанных задач
  const tasksQuery = query(
    collection(db, `users/${userId}/tasks`),
    where('projectId', '==', projectId),
    limit(1)
  );
  const taskSnapshot = await getDocs(tasksQuery);
  
  if (!taskSnapshot.empty) {
    throw new Error('Невозможно удалить проект: существуют связанные задачи');
  }
  
  // Проверяем наличие связанных смет
  const estimatesQuery = query(
    collection(db, `users/${userId}/estimates`),
    where('projectId', '==', projectId),
    limit(1)
  );
  const estimateSnapshot = await getDocs(estimatesQuery);
  
  if (!estimateSnapshot.empty) {
    throw new Error('Невозможно удалить проект: существуют связанные сметы');
  }
  
  // Если зависимостей нет, удаляем проект
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  await deleteDoc(projectRef);
};

// Get a real-time stream for a single project
export const getProjectStream = (userId: string, projectId: string, callback: (project: Project | null) => void) => {
  const projectPath = `users/${userId}/projects/${projectId}`;
  return onSnapshot(doc(db, projectPath), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Project);
    } else {
      callback(null);
    }
  });
};

/**
 * Получить поток активных проектов (ограниченный лимит)
 */
export const getActiveProjectsStream = (userId: string, limitCount: number = 5, callback: (projects: Project[]) => void) => {
  const projectsPath = `users/${userId}/projects`;
  const q = query(
    collection(db, projectsPath),
    where('status', '==', 'active'),
    orderBy('endDate', 'asc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
    callback(projects);
  });
};


