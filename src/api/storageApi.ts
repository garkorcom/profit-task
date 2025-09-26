import { collection, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { db, storage } from '../firebase/firebase';
import { TaskPhotoMeta } from './taskApi';

/**
 * Convert file to base64 for Cloud Function upload
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
  });
}

/**
 * Upload photo using Cloud Function (bypasses CORS)
 */
async function uploadViaFunction(
  userId: string,
  taskId: string,
  file: File,
  photoId: string,
  onProgress?: (pct: number) => void
): Promise<TaskPhotoMeta> {
  try {
    // Get current user's auth token
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // Convert file to base64
    onProgress?.(10);
    const base64Data = await fileToBase64(file);
    onProgress?.(50);
    
    // Get auth token
    const token = await user.getIdToken();
    
    // Call the simple HTTP function
    const response = await fetch('https://us-central1-profit-task.cloudfunctions.net/simplePhotoUpload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskId,
        photoId,
        base64Data,
        contentType: file.type || 'image/jpeg'
      })
    });
    
    onProgress?.(100);
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: photoId,
      taskId,
      url: data.url,
      createdAt: serverTimestamp(),
    };
  } catch (error) {
    console.error('Function upload failed:', error);
    throw error;
  }
}

/**
 * Загрузка фотографии задачи в Firebase Storage с сохранением метаданных в Firestore.
 * Automatically falls back to Cloud Function if CORS error is detected.
 */
export const uploadTaskPhoto = async (
  userId: string,
  taskId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<TaskPhotoMeta> => {
  const photosCollection = collection(db, `users/${userId}/tasks/${taskId}/photos`);
  const metaRef = doc(photosCollection);
  
  // Check if we're in production and should use Cloud Function directly
  const isProduction = window.location.hostname === 'profit-task.web.app' || 
                      window.location.hostname === 'profit-task.firebaseapp.com';
  
  if (isProduction) {
    // Use Cloud Function directly in production to avoid CORS
    console.log('Using Cloud Function for upload (production)');
    return uploadViaFunction(userId, taskId, file, metaRef.id, onProgress);
  }
  
  // Try direct upload for localhost
  const storageRef = ref(storage, `users/${userId}/tasks/${taskId}/photos/${metaRef.id}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<TaskPhotoMeta>((resolve, reject) => {
    let corsErrorDetected = false;
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percentage);
      },
      async (error: any) => {
        // Check if it's a CORS error
        console.error('Upload error:', error);
        if (error.code === 'storage/unauthorized' || 
            error.message?.includes('CORS') || 
            error.serverResponse?.includes('CORS') ||
            error.code === 'storage/unknown') {
          console.log('CORS/Auth error detected, using Cloud Function fallback');
          corsErrorDetected = true;
          try {
            const result = await uploadViaFunction(userId, taskId, file, metaRef.id, onProgress);
            resolve(result);
          } catch (funcError) {
            reject(funcError);
          }
        } else {
          reject(error);
        }
      },
      async () => {
        if (!corsErrorDetected) {
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
            // If getting URL fails, try Cloud Function
            console.log('Direct upload succeeded but URL fetch failed, using Cloud Function');
            try {
              const result = await uploadViaFunction(userId, taskId, file, metaRef.id, onProgress);
              resolve(result);
            } catch (funcError) {
              reject(funcError);
            }
          }
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

