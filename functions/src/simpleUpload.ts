import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const cors = require('cors');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });

/**
 * Simple HTTP function for photo upload
 */
export const simplePhotoUpload = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Set CORS headers explicitly
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get auth token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      const { taskId, photoId, base64Data, contentType } = req.body;

      if (!taskId || !photoId || !base64Data) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to storage
      const bucket = admin.storage().bucket();
      const filePath = `tasks/${userId}/${taskId}/photos/${photoId}`;
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

      // Make the file public
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

      res.status(200).json({ 
        success: true, 
        url: publicUrl,
        photoId: photoId 
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
});
