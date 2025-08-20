// Модуль работы с проектами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/projects/{projectId}
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

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

// Обновление проекта
export const updateProject = async (userId: string, projectId: string, updates: Partial<Project>) => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  await updateDoc(projectRef, { ...updates, updatedAt: serverTimestamp() });
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


