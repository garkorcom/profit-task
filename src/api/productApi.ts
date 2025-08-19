import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const getProductsStream = (userId: string, callback: (products: any[]) => void) => {
  const productsPath = `users/${userId}/products`;
  const q = query(collection(db, productsPath), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(products);
  });
};