# SyncSpend • Mobile Setup Guide

This guide walks you through connecting both **iPhone** and **Android** devices to your local SyncSpend Wi-Fi server.

---

## 📶 Step 1: Wi-Fi Prerequisites

1. Your PC (server) and mobile phone must be on the **same local Wi-Fi router / network**.
2. Find your PC's local IP address:
   - When you run `start-server.bat`, the IP is printed automatically (e.g. `http://10.0.0.184:3000`).
   - Or open PowerShell on your PC and run: `ipconfig` (look for *IPv4 Address* under Wireless LAN adapter).

---

## 📱 Step 2: iPhone Setup (PWA — No Mac or App Store Required)

SyncSpend runs as a full-screen, standalone Progressive Web App on iOS:

1. Open **Safari** on your iPhone.
2. In the URL address bar, type:
   ```
   http://<your-server-ip>:3000
   ```
   *(Example: `http://10.0.0.184:3000`)*
3. Tap the **Share** button at the bottom of Safari (the square icon with an arrow pointing up).
4. Scroll down and tap **"Add to Home Screen"** (➕).
5. Tap **Add** in the top right corner.
6. A standalone **SyncSpend** app icon now sits on your iPhone home screen. It runs full-screen without any browser address bars!

---

## 🤖 Step 3: Android Setup

### Option A: Install the pre-compiled APK
1. Locate the built APK file on your PC:
   `mobile_app\build\app\outputs\flutter-apk\app-debug.apk`
2. Send or transfer this `.apk` to your Android device via USB, Google Drive, WhatsApp, or Bluetooth.
3. Tap the `.apk` file on your phone and tap **Install** (allow *Install from Unknown Sources* if prompted).
4. Open the app, and enter your server address (default: `http://10.0.0.184:3000`).

### Option B: Run directly from PC
1. Connect your Android phone to your PC via USB cable.
2. Enable **Developer Options** and **USB Debugging** on the phone.
3. Double-click `run-app.bat` on your PC. Flutter will install and launch the app on your phone automatically.

---

## 💡 Troubleshooting Wi-Fi Connection

- **App says "Offline"**:
  - Verify your phone is connected to the same Wi-Fi SSID as your PC.
  - If Windows Firewall blocks port 3000, allow Node.js through the firewall or run in PowerShell (as Administrator):
    ```powershell
    New-NetFirewallRule -DisplayName "SyncSpend Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
    ```
