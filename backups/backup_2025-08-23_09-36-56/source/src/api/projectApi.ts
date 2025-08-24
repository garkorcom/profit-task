// Модуль работы с проектами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/projects/{projectId}
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, limit } from 'firebase/firestore';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType = 'internal' | 'external' | 'support' | 'development';

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  type: ProjectType;
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budget?: number;
  actualCost?: number;
  progress?: number; // 0-100
  clientId?: string; // Связь с контрагентом (клиентом)
  managerId?: string; // Ответственный менеджер
  departmentId?: string;
  parentProjectId?: string; // Для подпроектов
  template?: boolean;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any; // Soft delete
  
  // Старые поля для обратной совместимости (можно будет убрать после миграции)
  contractorId?: string;
  contractorName?: string;
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
  // Firestore не принимает поля со значением undefined. Удаляем такие поля перед записью
  const sanitizedData = Object.fromEntries(
    Object.entries(projectData as Record<string, any>).filter(([, value]) => value !== undefined)
  );
  const withTimestamps = {
    ...sanitizedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, projectsPath), withTimestamps);
  return ref.id;
};

// Обновление проекта
export const updateProject = async (userId: string, projectId: string, updates: Partial<Project>) => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  // Удаляем undefined, иначе updateDoc выбросит ошибку
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates as Record<string, any>).filter(([, value]) => value !== undefined)
  );
  await updateDoc(projectRef, { ...sanitizedUpdates, updatedAt: serverTimestamp() });
};

// Удаление проекта
export const deleteProject = async (userId: string, projectId: string) => {
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

export const getProjectByNameStream = (userId: string, name: string, callback: (project: Project | null) => void) => {
  const path = `users/${userId}/projects`;
  const q = query(collection(db, path), where('name', '==', name), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const project = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Project;
      callback(project);
    }
  });
};

/**
 * Получить поток активных проектов (ограниченный лимит)
 */
export const getActiveProjectsStream = (userId: string, limitCount: number = 5, callback: (projects: Project[]) => void) => {
  const projectsPath = `users/${userId}/projects`;
  // Минимизируем требования к индексам: только where, сортировку и лимит делаем на клиенте
  const q = query(
    collection(db, projectsPath),
    where('status', '==', 'active')
  );
  return onSnapshot(q, (snapshot) => {
    const projects = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[])
      .sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''))
      .slice(0, Math.max(1, limitCount));
    callback(projects);
  });
};


