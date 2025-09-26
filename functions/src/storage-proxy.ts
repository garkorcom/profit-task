import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable function to handle file uploads with proper authentication
 * This bypasses the Storage CORS issue by using the Admin SDK
 */
export const uploadTaskPhotoV2 = onCall(
  { 
    cors: true,
    maxInstances: 10
  }, 
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { taskId, photoId, base64Data, contentType } = request.data;

    if (!taskId || !photoId || !base64Data) {
      throw new HttpsError('invalid-argument', 'Missing required fields: taskId, photoId, or base64Data');
    }

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to storage
      const bucket = admin.storage().bucket();
      const filePath = `users/${userId}/tasks/${taskId}/photos/${photoId}`;
      const file = bucket.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: contentType || 'image/jpeg',
          metadata: {
            uploadedBy: userId,
            taskId: taskId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Make the file public and get the public URL
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Save metadata to Firestore
      const db = admin.firestore();
      await db.doc(`users/${userId}/tasks/${taskId}/photos/${photoId}`).set({
        id: photoId,
        url: publicUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        taskId: taskId,
        uploadedBy: userId,
        contentType: contentType || 'image/jpeg',
        storagePath: filePath
      });

      return { 
        success: true, 
        url: publicUrl,
        photoId: photoId 
      };

    } catch (error) {
      console.error('Upload error:', error);
      throw new HttpsError(
        'internal', 
        'Upload failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Callable function to delete task photos
 */
export const deleteTaskPhotoV2 = onCall(
  { 
    cors: true,
    maxInstances: 10
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { taskId, photoId } = request.data;

    if (!taskId || !photoId) {
      throw new HttpsError('invalid-argument', 'Missing required fields: taskId or photoId');
    }

    try {
      // Delete from storage
      const bucket = admin.storage().bucket();
      const filePath = `users/${userId}/tasks/${taskId}/photos/${photoId}`;
      const file = bucket.file(filePath);

      try {
        await file.delete();
      } catch (err) {
        console.warn('File might not exist in storage:', err);
      }

      // Delete metadata from Firestore
      const db = admin.firestore();
      await db.doc(`users/${userId}/tasks/${taskId}/photos/${photoId}`).delete();

      return { 
        success: true,
        message: 'Photo deleted successfully'
      };

    } catch (error) {
      console.error('Delete error:', error);
      throw new HttpsError(
        'internal',
        'Delete failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);
