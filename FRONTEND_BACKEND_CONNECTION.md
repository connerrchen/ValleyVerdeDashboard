# Frontend-Backend Connection Guide

Your Valley Verde Dashboard frontend and backend are now connected! Here's how to get everything running:

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- pip (Python package manager)
- npm (Node package manager)

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install fastapi uvicorn python-dotenv google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
SPREADSHEET_ID=your_google_spreadsheet_id_here
```

You'll need to set up Google Sheets API credentials:
- Follow the [Google Sheets API quickstart](https://developers.google.com/sheets/api/quickstart/python)
- Save your `credentials.json` file in the `backend/` directory

### 3. Run the Backend

```bash
cd backend
python -m uvicorn app:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**

## Frontend Setup

### 1. Install Node Dependencies

```bash
cd frontend-prototype
npm install
```

### 2. Configure Backend URL (Optional)

Edit `frontend-prototype/.env` if your backend runs on a different URL:

```
VITE_API_URL=http://localhost:8000
```

### 3. Run the Frontend

```bash
cd frontend-prototype
npm run dev
```

Frontend will be available at: **http://localhost:5173**

## Quick Start (Both Services)

You can use the provided startup script:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

This will start both services in the background.

## API Endpoint

The frontend fetches data from:

```
GET http://localhost:8000/api/summary
```

**Response format:**
```json
{
  "avg_worry": 6.5,
  "worry_distribution": { "5": 3, "6": 2, "7": 4 },
  "percent_extremely_worried": 45.5,
  "percent_not_worried": 10.0,
  "trouble_affording_counts": { "Fresh fruits/vegetables": 12, "Meat/eggs/milk": 8 },
  "percent_with_trouble_affording": 70.0,
  "trouble_finding_counts": { "Fresh fruits/vegetables": 7, "Culturally relevant foods": 5 },
  "percent_with_trouble_finding": 35.0,
  "knowledge_counts": { "Preparing healthy meals": 15, "Growing my own food": 8 },
  "future_concern_counts": { "More concerned": 18, "Equally concerned": 12 }
}
```

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console, make sure:
- Backend is running on `http://localhost:8000`
- Frontend is running on `http://localhost:5173`
- Backend has CORS middleware enabled (it does by default)

### Backend Connection Issues
- Check backend logs for errors
- Ensure the `VITE_API_URL` in frontend `.env` matches your backend URL
- Make sure port 8000 is not in use

### Frontend Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear browser cache or use private/incognito mode

## Next Steps

- Configure your Google Sheets integration in the backend
- Customize the CORS allowed origins in `backend/app.py` for production
- Set up environment-specific configurations for different deployment targets
