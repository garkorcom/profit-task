# Firebase Storage CORS Configuration

## Problem
You're getting CORS errors when trying to upload photos from the Task Details Drawer:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Solution

### Option 1: Using Google Cloud Console (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`profit-task`)
3. Go to **Cloud Storage** → **Buckets**
4. Find your bucket (`profit-task.appspot.com` or `profit-task.firebasestorage.app`)
5. Click on the bucket name
6. Go to the **Configuration** tab
7. Click **Edit CORS Configuration**
8. Paste the contents from `cors.json`:
```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001", "https://profit-task.web.app", "https://profit-task.firebaseapp.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
]
```
9. Click **Save**

### Option 2: Using gsutil Command Line
If you have Google Cloud SDK installed:

1. Install Google Cloud SDK if not already installed:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate:
   ```bash
   gcloud auth login
   gcloud config set project profit-task
   ```

3. Apply CORS configuration:
   ```bash
   gsutil cors set cors.json gs://profit-task.appspot.com
   # or if your bucket is named differently:
   gsutil cors set cors.json gs://profit-task.firebasestorage.app
   ```

4. Verify the configuration:
   ```bash
   gsutil cors get gs://profit-task.appspot.com
   ```

### Option 3: Using Firebase Admin SDK (Alternative)
Add this to your Firebase Storage Rules (storage.rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Then deploy:
```bash
firebase deploy --only storage:rules
```

## Testing
After applying CORS configuration:
1. **Hard refresh** your browser (Cmd+Shift+R on Mac, Ctrl+F5 on Windows)
2. Try uploading a photo in the Task Details Drawer
3. The upload should work without CORS errors

## Additional Notes
- CORS changes may take a few minutes to propagate
- Make sure you're authenticated in Firebase when testing
- The file upload size limit in Firebase Storage is 5TB per file by default
- For production, update the `origin` array in cors.json to include your production domain

## Troubleshooting
If CORS errors persist:
1. Check that the bucket name is correct
2. Verify Firebase Authentication is working (check Network tab in DevTools)
3. Check Firebase Storage rules allow authenticated writes
4. Try clearing browser cache and cookies
5. Check Firebase console for any project quotas or billing issues