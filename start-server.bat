@echo off
title Expense Tracker - Local Wi-Fi Server
cd /d "%~dp0server"
echo =========================================================
echo    Starting Local Expense Tracker Server...
echo =========================================================
npm start
pause
