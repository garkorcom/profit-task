import { db } from '../firebase/firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import type { ServiceComponent } from './productApi';

export interface ServiceTemplate {
  id: string;
  name: string;
  components: ServiceComponent[];
  createdAt?: any;
  updatedAt?: any;
}

const templatesPath = (userId: string) => `users/${userId}/serviceTemplates`;

export const getServiceTemplatesStream = (
  userId: string,
  cb: (templates: ServiceTemplate[]) => void
) => {
  const q = query(collection(db, templatesPath(userId)), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ServiceTemplate[];
    cb(data);
  });
};

export const saveServiceTemplate = async (
  userId: string,
  name: string,
  components: ServiceComponent[]
) => {
  const ref = await addDoc(collection(db, templatesPath(userId)), {
    name,
    components,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  } as any);
  return ref.id;
};

export const deleteServiceTemplate = async (userId: string, templateId: string) => {
  await deleteDoc(doc(db, templatesPath(userId), templateId));
};


