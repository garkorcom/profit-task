"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTaskPhoto = exports.uploadTaskPhoto = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Cloud Function to handle file uploads with proper CORS headers
 * This bypasses the Storage CORS issue by using the Admin SDK
 */
exports.uploadTaskPhoto = (0, https_1.onRequest)({
    cors: ['http://localhost:3000', 'http://localhost:3001', 'https://profit-task.web.app', 'https://profit-task.firebaseapp.com'],
    maxInstances: 10
}, async (req, res) => {
    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const { taskId, photoId, base64Data, contentType } = req.body;
        if (!taskId || !photoId || !base64Data) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
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
        res.status(200).json({
            success: true,
            url: publicUrl,
            photoId: photoId
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Cloud Function to delete task photos
 */
exports.deleteTaskPhoto = (0, https_1.onRequest)({
    cors: ['http://localhost:3000', 'http://localhost:3001', 'https://profit-task.web.app', 'https://profit-task.firebaseapp.com'],
    maxInstances: 10
}, async (req, res) => {
    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        if (req.method !== 'DELETE') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const { taskId, photoId } = req.body;
        if (!taskId || !photoId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Delete from storage
        const bucket = admin.storage().bucket();
        const filePath = `users/${userId}/tasks/${taskId}/photos/${photoId}`;
        const file = bucket.file(filePath);
        try {
            await file.delete();
        }
        catch (err) {
            console.warn('File might not exist in storage:', err);
        }
        // Delete metadata from Firestore
        const db = admin.firestore();
        await db.doc(`users/${userId}/tasks/${taskId}/photos/${photoId}`).delete();
        res.status(200).json({
            success: true,
            message: 'Photo deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Delete failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=storage-cors-proxy.js.map