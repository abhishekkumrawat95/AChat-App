# Vercel Deployment Guide for AChat

## Setup Steps

### 1. Prepare Your Firebase Service Account
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate New Private Key" and copy the JSON content
- Keep this private and secure!

### 2. Configure Environment Variables on Vercel
In your Vercel project settings, add the following environment variable:

**Variable Name:** `FIREBASE_SERVICE_ACCOUNT`
**Value:** Paste your entire `serviceAccountKey.json` as a single-line JSON string

To convert the JSON file to a string:
```bash
# On PowerShell, you can do:
Get-Content server/serviceAccountKey.json | ConvertTo-Json -Compress
```

### 3. Update Your Vercel Domain
Once deployed, note your Vercel URL (e.g., `https://yourapp.vercel.app`).

Update [server/server.js](server/server.js) if needed - the code automatically adds your Vercel URL to CORS origins.

### 4. Deploy to Vercel
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy
vercel

# Or use your GitHub integration
```

## Project Structure

- **Client** (`client/`) - React frontend
  - Deployed to Vercel as static files
  - Runs on `/`
  
- **Server** (`server/`) - Node.js Express + Socket.io
  - Deployed to Vercel as serverless functions
  - Runs on `/api/`
  - All API routes are routed to this server

## Key Files Modified

- [vercel.json](vercel.json) - Vercel build configuration
- [server/package.json](server/package.json) - Added start script
- [server/server.js](server/server.js) - Added Vercel environment support
- [client/src/App.js](client/src/App.js) - Dynamic socket URL

## Troubleshooting

### Socket Connection Issues
- Check that your Vercel domain is in the CORS origins
- Check browser console for connection errors
- Verify the socket URL is correct (`https://yourdomain.vercel.app` in production)

### Firebase/Firestore Access
- Ensure `FIREBASE_SERVICE_ACCOUNT` environment variable is set
- Check Firebase rules allow your service account
- Verify permissions in Firebase Console

### Port Issues
- Server automatically uses `process.env.PORT` (Vercel provides this)
- Local development uses port 5000

### Preview Deployments
- Each preview branch gets its own URL
- The server automatically adds the preview URL to CORS origins via `process.env.VERCEL_URL`

## Local Development

```bash
# Terminal 1 - Server
cd server
npm install
npm start
# Server runs on http://localhost:5000

# Terminal 2 - Client
cd client
npm install
npm start
# Client runs on http://localhost:3000
```

Socket will connect to `http://localhost:5000` in development.
