import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';

export type OperationType = 'income' | 'expense';
export type OperationCategory = 'payment' | 'salary' | 'materials' | 'services' | 'other';

export interface FinancialOperation {
  id: string;
  projectId: string;
  type: OperationType;
  category: OperationCategory;
  description: string;
  amount: number;
  date: any; // Firestore Timestamp
  relatedInvoiceId?: string;
  relatedTaskId?: string;
  createdAt?: any;
}

/**
 * Получить поток финансовых операций по проекту
 */
export const getProjectFinancialsStream = (
  userId: string,
  projectId: string,
  callback: (operations: FinancialOperation[]) => void
) => {
  const path = `users/${userId}/projects/${projectId}/financials`;
  const q = query(collection(db, path), orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const operations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FinancialOperation[];
    callback(operations);
  });
};

/**
 * Добавить финансовую операцию и обновить бюджет проекта
 */
export const addFinancialOperation = async (
  userId: string,
  projectId: string,
  operationData: Omit<FinancialOperation, 'id' | 'createdAt' | 'projectId'>
) => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  const financialsCol = collection(db, `users/${userId}/projects/${projectId}/financials`);
  
  await runTransaction(db, async (transaction) => {
    const projectDoc = await transaction.get(projectRef);
    if (!projectDoc.exists()) {
      throw new Error("Проект не найден!");
    }
    
    // 1. Добавляем финансовую операцию
    const newOpData = {
      ...operationData,
      projectId,
      createdAt: serverTimestamp(),
      date: operationData.date || serverTimestamp()
    };
    transaction.set(doc(financialsCol), newOpData);
    
    // 2. Обновляем фактическую стоимость проекта
    if (operationData.type === 'expense') {
      const currentCost = projectDoc.data().actualCost || 0;
      const newCost = currentCost + operationData.amount;
      transaction.update(projectRef, { actualCost: newCost, updatedAt: serverTimestamp() });
    }
  });
};
