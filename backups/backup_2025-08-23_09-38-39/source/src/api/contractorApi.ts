// Модуль работы с контрагентами (CRUD и стриминг из Firestore)
// Структура хранения: users/{userId}/contractors/{contractorId}
import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Тип контрагента: поставщик/клиент/оба
export interface Contractor {
  id: string;
  name: string;
  type: 'supplier' | 'customer' | 'both'; // поставщик, клиент, или оба
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  inn?: string; // ИНН
  kpp?: string; // КПП
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    bik?: string;
    correspondentAccount?: string;
  };
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Подписка на список контрагентов пользователя в реальном времени.
 * Сортируем по name по возрастанию для стабильного отображения.
 */
export const getContractorsStream = (userId: string, callback: (contractors: Contractor[]) => void) => {
  const contractorsPath = `users/${userId}/contractors`;
  const q = query(collection(db, contractorsPath), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const contractors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Contractor[];
    callback(contractors);
  });
};

/**
 * Подписка на одного контрагента. Возвращает null, если документ удалён или отсутствует.
 */
export const getContractorStream = (userId: string, contractorId: string, callback: (contractor: Contractor | null) => void) => {
  const contractorRef = doc(db, `users/${userId}/contractors`, contractorId);
  return onSnapshot(contractorRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Contractor);
    } else {
      callback(null);
    }
  });
};

/**
 * Создание контрагента с автоматическими временными метками.
 * Возвращает id созданного документа.
 */
export const addContractor = async (userId: string, contractorData: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>) => {
  const contractorsPath = `users/${userId}/contractors`;
  const contractorWithTimestamp = {
    ...contractorData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  try {
    const docRef = await addDoc(collection(db, contractorsPath), contractorWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Ошибка при добавлении контрагента:', error);
    throw error;
  }
};

/**
 * Частичное обновление полей контрагента с обновлением updatedAt.
 */
export const updateContractor = async (userId: string, contractorId: string, updates: Partial<Contractor>) => {
  const contractorRef = doc(db, `users/${userId}/contractors`, contractorId);
  const updatesWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  try {
    await updateDoc(contractorRef, updatesWithTimestamp);
  } catch (error) {
    console.error('Ошибка при обновлении контрагента:', error);
    throw error;
  }
};

/**
 * Удаление контрагента по id.
 */
export const deleteContractor = async (userId: string, contractorId: string) => {
  const contractorRef = doc(db, `users/${userId}/contractors`, contractorId);
  
  try {
    await deleteDoc(contractorRef);
  } catch (error) {
    console.error('Ошибка при удалении контрагента:', error);
    throw error;
  }
};
