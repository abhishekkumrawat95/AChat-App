# AChat Vercel Deployment Guide

## Quick Start

### 1. Prerequisites
- GitHub account with your repository pushed
- Vercel account (free tier available at vercel.com)
- Firebase project with Service Account credentials

### 2. Setup Steps

#### Step 1: Get Firebase Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Copy the entire JSON content

#### Step 2: Set Environment Variables on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste your entire Firebase service account JSON as a single-line string
   
   Example value:
   ```
   {"type":"service_account","project_id":"achat-app-6e714",...}
   ```

#### Step 3: Add Client Environment Variables
These should be in your `client/.env.local` locally, and on Vercel:

```
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### Step 4: Update CORS Rules in Firebase

Go to Firebase Console → Storage → Rules and update:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Deploy to Vercel

#### Using GitHub (Recommended)
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/)
3. Click "New Project"
4. Import your GitHub repository
5. Set environment variables (as above)
6. Click "Deploy"

#### Using Vercel CLI
```bash
npm install -g vercel

# Navigate to project root
cd path/to/AChat

# Deploy
vercel

# Set environment variables when prompted
# Or use: vercel env add FIREBASE_SERVICE_ACCOUNT
```

### 4. Verify Deployment

1. **Check Client:** Visit your Vercel URL (e.g., `https://yourapp.vercel.app`)
2. **Check Server:** Go to `https://yourapp.vercel.app/socket.io/` - you should see a Socket.IO response

## Troubleshooting

### Build Fails
- Check that `client/build/` directory exists locally
- Verify all environment variables are set correctly on Vercel
- Check Vercel logs: Dashboard → Project → Deployments → Select deployment → Logs

### Socket.IO Not Working
- Verify `FIREBASE_SERVICE_ACCOUNT` is set correctly
- Check that your Vercel domain is in the CORS allowlist in `api/socket.js`
- Verify Firebase credentials have proper permissions

### Images Not Loading
- Check Firebase Storage Rules allow `read` for authenticated users
- Verify imageURL in Firestore are valid Firebase Storage URLs

### Messages Not Sending
- Check browser console for errors
- Verify Firebase Firestore Rules:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{document=**} {
        allow read, write: if request.auth != null;
      }
      match /chats/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

## Project Structure

```
AChat/
├── client/          # React Frontend (Deployed as static)
├── server/          # Local development server
├── api/             # Vercel serverless functions
│   └── socket.js    # Socket.IO handler
├── vercel.json      # Vercel configuration
└── .vercelignore    # Files to ignore on Vercel
```

## Production URLs

After deployment, your app will be available at:
- **Frontend:** `https://yourapp.vercel.app/`
- **Socket.IO:** `https://yourapp.vercel.app/socket.io/`

## Important Notes

1. **Firebase Service Account** - Never commit `serviceAccountKey.json` to Git
2. **Environment Variables** - Always use Vercel's environment variable settings
3. **CORS** - Vercel automatically adds your domain to allowed origins
4. **Socket.IO** - Uses WebSocket upgrade with long-polling fallback

## Support

For issues:
1. Check Vercel deployment logs
2. Check Firebase Console for quota/permission issues
3. Check browser DevTools → Network/Console for errors

