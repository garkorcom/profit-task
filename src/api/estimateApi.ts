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
 * Создать новую смету
 */
export const addEstimate = async (
  userId: string,
  estimateData: Omit<Estimate, 'id'>
) => {
  const estimatesPath = `users/${userId}/estimates`;
  const data = {
    ...estimateData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, estimatesPath), data);
  return docRef.id;
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
 * Удалить смету
 */
export const deleteEstimate = async (userId: string, estimateId: string) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  await deleteDoc(doc(db, estimatePath));
};
