import { db } from '../firebase/firebase';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';

export interface ShoppingCheck {
  id: string; // itemKey
  itemText: string;
  projectId?: string; // undefined/'' означает общий список (все проекты)
  checked: boolean;
  updatedAt?: any;
}

export const getShoppingChecksMap = (userId: string, projectId?: string, cb?: (map: Record<string, ShoppingCheck>) => void) => {
  const path = `users/${userId}/shoppingChecks`;
  const q = projectId ? query(collection(db, path), where('projectId', '==', projectId)) : query(collection(db, path));
  return onSnapshot(q, (snap) => {
    const map: Record<string, ShoppingCheck> = {};
    snap.forEach(d => { map[d.id] = { id: d.id, ...(d.data() as any) }; });
    cb && cb(map);
  });
};

export const setShoppingCheck = async (userId: string, itemKey: string, payload: Omit<ShoppingCheck, 'id'>) => {
  const ref = doc(db, `users/${userId}/shoppingChecks`, itemKey);
  const data: any = { ...payload };
  if (data.projectId === undefined) {
    delete data.projectId; // Firestore не принимает undefined — поле нужно удалить
  }
  await setDoc(ref, data, { merge: true });
};


