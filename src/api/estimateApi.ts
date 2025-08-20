import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  increment, // Импортируем increment
  orderBy,
} from 'firebase/firestore';

/**
 * Позиция в смете
 */
export interface EstimateItem {
  id: string; // Обычно это ID товара/услуги из справочника
  name: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
  type: 'product' | 'service';
}

/**
 * Смета (Estimate)
 */
export interface Estimate {
  id: string;
  number: string; // Номер сметы, может генерироваться
  projectId: string;
  projectName?: string;
  contractorId?: string;
  contractorName?: string;
  description?: string;
  items: EstimateItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Получить поток всех смет для одного проекта
 */
export const getEstimatesStream = (
  userId: string,
  projectId: string,
  callback: (estimates: Estimate[]) => void
) => {
  const estimatesPath = `users/${userId}/estimates`;
  const q = query(
    collection(db, estimatesPath),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const estimates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Estimate[];
    callback(estimates);
  });
};

/**
 * Получить поток одной сметы
 */
export const getEstimateStream = (
  userId: string,
  estimateId: string,
  callback: (estimate: Estimate | null) => void
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  return onSnapshot(doc(db, estimatePath), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Estimate);
    } else {
      callback(null);
    }
  });
};

/**
 * Создать новую смету и атомарно обновить счетчик в проекте
 */
export const addEstimate = async (
  userId: string,
  estimateData: Omit<Estimate, 'id'>
) => {
  const batch = writeBatch(db);

  // 1. Создаем ссылку на новую смету
  const estimatesPath = `users/${userId}/estimates`;
  const newEstimateRef = doc(collection(db, estimatesPath));
  
  const data = {
    ...estimateData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(newEstimateRef, data);

  // 2. Обновляем счетчик в проекте
  const projectRef = doc(db, `users/${userId}/projects`, estimateData.projectId);
  batch.update(projectRef, { estimatesCount: increment(1) });

  await batch.commit();
  return newEstimateRef.id;
};

/**
 * Обновить смету
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  const data = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, estimatePath), data);
};

/**
 * Удалить смету и атомарно обновить счетчик в проекте
 */
export const deleteEstimate = async (userId: string, estimateId: string, projectId: string) => {
  const batch = writeBatch(db);

  // 1. Удаляем смету
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  batch.delete(doc(db, estimatePath));

  // 2. Уменьшаем счетчик в проекте
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  batch.update(projectRef, { estimatesCount: increment(-1) });

  await batch.commit();
};
