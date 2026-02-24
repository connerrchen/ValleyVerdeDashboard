#!/bin/bash
# Script to start both backend and frontend

echo "Starting Valley Verde Dashboard..."
echo ""

# Start backend in background
echo "🚀 Starting backend (FastAPI)..."
cd backend
python app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "🚀 Starting frontend (Vite)..."
cd ../frontend-prototype
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo ""

echo "========================================"
echo "✅ Both services are running!"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for Ctrl+C
wait

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "Services stopped."
