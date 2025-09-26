# Manual CORS Setup for Firebase Storage

Since we cannot authenticate gsutil interactively, please follow these manual steps to fix the CORS issue:

## Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/project/profit-task/storage)
2. Click on the **Rules** tab
3. Make sure your rules allow authenticated users to read/write:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
4. Click **Publish**

## Option 2: Google Cloud Console Web UI

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser?project=profit-task)
2. Find your bucket: `profit-task.firebasestorage.app`
3. Click on the bucket name
4. Go to the **Configuration** tab (or click the three dots menu → Edit bucket configuration)
5. Find **CORS configuration** section
6. Click **Add** or **Edit**
7. Add this configuration:
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
8. Save the configuration

## Option 3: Using gcloud CLI (On Another Machine)

If you have access to another machine where you can authenticate:

1. Install Google Cloud SDK:
```bash
curl https://sdk.cloud.google.com | bash
```

2. Authenticate:
```bash
gcloud auth login
gcloud config set project profit-task
```

3. Apply CORS from the project directory:
```bash
gsutil cors set cors.json gs://profit-task.firebasestorage.app
```

4. Verify it worked:
```bash
gsutil cors get gs://profit-task.firebasestorage.app
```

## Option 4: Using Service Account Key

1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/serviceaccounts?project=profit-task)
2. Create a new service account or use existing Firebase Admin SDK account
3. Create and download a JSON key
4. Run:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
gsutil cors set cors.json gs://profit-task.firebasestorage.app
```

## Testing After Setup

1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+F5 on Windows)
2. Go to https://profit-task.web.app/tasks
3. Click on any task to open the Task Details Drawer
4. Try uploading a photo
5. The upload should work without CORS errors

## Current CORS Configuration

The `cors.json` file in your project root contains:
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

## Notes

- CORS changes may take up to 10 minutes to propagate
- The Firebase Storage bucket name is: `profit-task.firebasestorage.app`
- Make sure you're logged in with an account that has Storage Admin permissions
