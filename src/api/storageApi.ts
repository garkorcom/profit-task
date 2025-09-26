import { collection, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { db, storage } from '../firebase/firebase';
import { TaskPhotoMeta } from './taskApi';

/**
 * Загрузка фотографии задачи в Firebase Storage с сохранением метаданных в Firestore.
 */
export const uploadTaskPhoto = async (
  userId: string,
  taskId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<TaskPhotoMeta> => {
  const photosCollection = collection(db, `users/${userId}/tasks/${taskId}/photos`);
  const metaRef = doc(photosCollection);
  const storageRef = ref(storage, `users/${userId}/tasks/${taskId}/photos/${metaRef.id}`);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<TaskPhotoMeta>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percentage);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          const meta: TaskPhotoMeta = {
            id: metaRef.id,
            taskId,
            url,
            createdAt: serverTimestamp(),
          };
          await setDoc(metaRef, meta);
          resolve(meta);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

/**
 * Удаление фотографии и связанной метаинформации.
 */
export const deleteTaskPhoto = async (
  userId: string,
  taskId: string,
  photo: TaskPhotoMeta
): Promise<void> => {
  const storageRef = ref(storage, `users/${userId}/tasks/${taskId}/photos/${photo.id}`);
  await deleteObject(storageRef).catch(() => undefined);

  const metaRef = doc(db, `users/${userId}/tasks/${taskId}/photos/${photo.id}`);
  await deleteDoc(metaRef);
};

