import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const getInvoicesStream = (userId: string, callback: (invoices: any[]) => void) => {
  const invoicesPath = `users/${userId}/invoices`;
  const q = query(collection(db, invoicesPath), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(invoices);
  });
};