# Render Build Optimization Guide

## Memory Optimizations Applied

### Backend (Python/FastAPI)
1. **Caching**: Added 5-minute cache for Google Sheets data to reduce API calls
2. **LRU Cache**: Google Sheets service is cached to avoid repeated authentication
3. **Gunicorn Configuration**: Limited to 2 workers with request recycling
   - `--max-requests 1000` - Recycle workers after 1000 requests to prevent memory leaks
   - `--max-requests-jitter 50` - Add randomness to avoid all workers recycling at once

### Frontend (React/Vite)
1. **Build Configuration**:
   - Manual chunk splitting for vendor libraries
   - esbuild minification (faster, less memory than terser)
   - Disabled source maps in production
   - Limited chunk size warnings

2. **Node.js Memory**:
   - Set `--max-old-space-size=2048` to limit memory to 2GB
   - Added `.npmrc` to reduce concurrent operations

3. **Dependencies**:
   - No heavy dependencies removed (charts/maps needed)
   - Build uses `--legacy-peer-deps` to avoid dependency conflicts

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
