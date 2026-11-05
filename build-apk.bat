@echo off
title Build Expense Tracker APK
cd /d "%~dp0mobile_app"
echo =========================================================
echo    Building Debug APK for Android Phone...
echo =========================================================
flutter build apk --debug
echo.
echo =========================================================
echo    APK built! File is located at:
echo    mobile_app\build\app\outputs\flutter-apk\app-debug.apk
echo =========================================================
pause
