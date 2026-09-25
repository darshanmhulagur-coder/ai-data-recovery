@echo off
title ForensiX-AI (Dev Mode)
color 0a

echo =====================================================================
echo         FORENSIX-AI DUAL DEV MODE (VITE HMR + FASTAPI)
echo =====================================================================
echo.

start "ForensiX Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "ForensiX Frontend" cmd /k "cd frontend && npm.cmd run dev"

timeout /t 2 /nobreak >nul
start "" http://localhost:5173

echo Servers running!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
pause
