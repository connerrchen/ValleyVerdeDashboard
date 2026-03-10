# Render Build Optimization Guide

## Memory Optimizations Applied

### Backend (Python/FastAPI)

1. **Caching**: Added 5-minute cache for Google Sheets data to reduce API calls
2. **LRU Cache**: Google Sheets service is cached to avoid repeated authentication
3. **Gunicorn Configuration**: Optimized for minimal memory usage
   - `--workers 1` - Single worker (uses ~256MB instead of 512MB)
   - `--max-requests 500` - Recycle worker every 500 requests (prevents memory leaks)
   - `--max-requests-jitter 50` - Add randomness to worker restarts
   - `--worker-tmp-dir /dev/shm` - Use shared memory for heartbeat (reduces disk I/O)
4. **Environment Variables**:
   - `WEB_CONCURRENCY=1` - Ensures single worker even if Render tries to scale
   - `WORKER_CLASS` - Explicitly set worker type

### Frontend (React/Vite)

1. **Build Configuration**:
   - Manual chunk splitting for vendor libraries
   - esbuild minification (faster, less memory than terser)
   - Disabled source maps in production
   - Limited chunk size warnings

2. **Build Command Optimization**:
   - `npm ci` instead of `npm install` (faster, deterministic, less memory)
   - `--prefer-offline` - Use cache when possible
   - `--no-audit` - Skip security audit during install (saves memory)
   - `NODE_OPTIONS='--max-old-space-size=1536'` - Limit to 1.5GB (reduced from 2GB)
   - `CI=true` - Optimizes npm for CI environments

3. **Created [.npmrc](frontend/.npmrc)** to reduce concurrent operations during install

## Deployment Commands

### For Render.com:

```bash
# Backend
pip install --no-cache-dir -r requirements.txt
gunicorn app:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT

# Frontend
cd frontend && npm install --legacy-peer-deps && npm run build
```

### Manual Deployment:

Use the `render.yaml` file created for automatic Blueprint deployment.

## Environment Variables Required

### Backend:

- `SPREADSHEET_ID` - Google Sheets ID
- `SHEETS_RANGE` - Data range (e.g., "A2:N")
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account credentials (JSON string)

### Frontend:

- `VITE_API_URL` - Backend API URL (e.g., "https://your-backend.onrender.com/api")

## Memory Leak Prevention

1. **Backend**: Workers restart after 1000 requests
2. **Frontend**: Static build means no runtime memory issues
3. **Caching**: Limits repeated data fetching

## If Memory Issues Persist

1. Upgrade to paid Render plan (more RAM)
2. Further reduce worker count to 1
3. Increase cache TTL to reduce Sheets API calls
4. Consider serverless deployment for backend (Vercel Functions, AWS Lambda)
