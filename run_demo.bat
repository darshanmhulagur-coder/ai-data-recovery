@echo off
title ForensiX-AI: DFIR Intelligent Reconstruction Platform
color 0b

echo =====================================================================
echo           FORENSIX-AI: DIGITAL EVIDENCE RECONSTRUCTION ENGINE
echo           CALMSTACKS 24H HACKATHON // CYBERSECURITY ^& AI
echo =====================================================================
echo.

echo [1/3] Checking Python environment...
python --version
if errorlevel 1 (
    echo [ERROR] Python not found in PATH!
    pause
    exit /b 1
)

echo.
echo [2/3] Starting ForensiX-AI Unified Server on http://localhost:8000 ...
echo [INFO] Serving FastAPI Backend + React DFIR Command Center Dashboard.
echo.

start "" http://localhost:8000

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
