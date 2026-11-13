# 💸 SyncSpend

[![Release](https://img.shields.io/badge/Release-v1.2.0-4361EE.svg)](https://github.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.44+-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Tesseract OCR](https://img.shields.io/badge/OCR-Tesseract.js-5c6bc0?logo=thealgorithms&logoColor=white)](https://github.com/naptha/tesseract.js)
[![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **A privacy-first, multi-user expense tracking system that connects mobile phones (Android & iPhone) to your local server over Wi-Fi. Features full administrator user management, persistent bill photo storage with pinch-to-zoom viewer, intelligent OCR bill scanning, combined household/team totals, and individual member ledgers with no cloud accounts or subscriptions required.**

---

## 🌟 Highlights

- **👑 Full Administrator User Control (v1.2.0)**:
  - Role-based authorization (`admin` vs `user`).
  - Administrators have full user lifecycle management: view spend statistics across all members, create new user accounts with credentials and roles, reset passwords, and delete user accounts (with automatic cascading expense removal and active self-deletion safety).
  - Dedicated **Admin** management panels in both the Web dashboard and Flutter mobile app.
- **🧾 Persistent Bill Photo Storage & Lightbox Viewers (v1.2.0)**:
  - When bills or receipts are scanned, photos are uploaded and permanently saved to the server disk (`/uploads/receipts/`) and linked to the expense.
  - **Web Dashboard**: Click `🧾 View Bill` to launch an interactive lightbox modal with a link to full-resolution images.
  - **Flutter Mobile App**: Click the `🧾` button on any transaction to open an `InteractiveViewer` with fluid pinch-to-zoom pan/zoom controls.
  - **Add Form Attached Preview**: Shows a thumbnail preview chip when a receipt is captured with 1-click removal.
- **📸 Smart OCR Bill & Receipt Scanner**:
  - Snap a photo of any receipt or upload a bill to auto-extract amount, merchant/title, and date.
  - Powered by embedded WebAssembly Tesseract OCR — runs locally on your private server.
  - Pre-fills the form with high confidence; review or edit with one tap before submitting.
- **👥 Combined & User-Organized Ledgers**:
  - **Combined (All Users)**: View unified household/team totals, monthly spending, and category distribution.
  - **Personal Ledgers**: View personal spending or filter by any specific member with one tap.
  - **"By User" Leaderboard**: See who spent how much, transaction counts, and percentage share of combined total with visual progress bars.
  - **User Attribution**: Color-coded member badges on every transaction item.
- **🔐 Secure Multi-User Auth**:
  - `bcrypt` password hashing and `JWT` token authentication.
  - Default `admin` account with self-registration for unlimited family or team members.
- **📶 Local Wi-Fi Sync**:
  - Zero cloud dependencies — all data stays on your local machine in `expenses.db` and receipt photos in `server/uploads/receipts/`.
  - Auto-detects your local LAN/Wi-Fi IP for seamless connection.
- **📱 True Cross-Platform**:
  - **Android**: Native compiled Flutter APK (`mobile_app`).
  - **iPhone**: Instant PWA via Safari (*Add to Home Screen*) with full-screen standalone app experience.
  - **Desktop / Web**: Built-in responsive executive dashboard.

---

## 🏗️ System Architecture

```
                       ┌───────────────────────────────┐
                       │    Android Phone (Flutter)    │
                       │             - or -            │
                       │     iPhone (Safari PWA)       │
                       └───────────────┬───────────────┘
                                       │ (Local Wi-Fi / REST API)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOCAL SERVER (Node.js / Express)                      │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │  JWT & Bcrypt Auth    │  │  Admin User CRUD API  │  │ Web Dashboard   │  │
│  │  /api/auth/login      │  │  /api/admin/users     │  │ /public         │  │
│  │  /api/auth/register   │  │  Create, edit, delete │  │ Live UI & PWA   │  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └─────────────────┘  │
│             │                           │                                   │
│             ▼                           ▼                                   │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │  OCR Scanner Engine   │  │  Multi-User API       │  │ Receipt Storage │  │
│  │  Tesseract.js OCR     │  │  Combined / Personal  │  │ /uploads/       │  │
│  │  /api/ocr/scan        │  │  /api/expenses        │  │ receipts/       │  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └─────────────────┘  │
│             │                           │                                   │
│             ▼                           ▼                                   │
│  ┌──────────────────────────────────────────────────┐                       │
│  │           Embedded SQLite Database               │                       │
│  │     users table  ◄──────►  expenses table        │                       │
│  │     (role, auth)           (receipt_image)       │                       │
│  └──────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Clone & Start Local Server
```bash
# Start server using the Windows batch launcher
start-server.bat

# Or via command line
cd server
npm install
npm start
```

The server displays your machine's Wi-Fi IP address:
```
=============================================================
   SYNCSPEND PRO • MULTIUSER OCR SERVER RUNNING (v1.2.0)
   [+] Full Admin Control of Users & Persistent Bill Storage
=============================================================
  > Local Machine:  http://localhost:3000
  > Wi-Fi / Mobile: http://10.0.0.184:3000
  > Receipts Dir:   http://10.0.0.184:3000/uploads/receipts/
  > Default Account: admin / admin123 (or register in app)
=============================================================
```

### 2. Connect Your Mobile Device

#### 📱 iPhone (Safari PWA)
1. Ensure your iPhone is connected to the same Wi-Fi.
2. In Safari, go to `http://<your-server-ip>:3000` (e.g. `http://10.0.0.184:3000`).
3. Tap **Share** -> **Add to Home Screen** (➕).
4. Launch the standalone app icon from your home screen.

#### 🤖 Android Phone
- Transfer [`mobile_app\build\app\outputs\flutter-apk\app-debug.apk`](mobile_app/build/app/outputs/flutter-apk/app-debug.apk) to your phone and install.
- Or run `run-app.bat` with USB debugging enabled.

---

## 📡 REST API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Login and receive JWT access token |
| `GET` | `/api/auth/me` | Bearer Token | Current user profile |
| `GET` | `/api/admin/users` | Admin Only | Full user list with spend totals and role |
| `POST` | `/api/admin/users` | Admin Only | Create new user account with credentials and role |
| `DELETE` | `/api/admin/users/:id` | Admin Only | Delete user account and cascade expenses |
| `PUT` | `/api/admin/users/:id` | Admin Only | Update user profile, role, or reset password |
| `GET` | `/api/users` | Bearer Token | List all users with spend totals and % share |
| `GET` | `/api/expenses?userId=all` | Bearer Token | Combined expenses across all users |
| `GET` | `/api/expenses?userId=me` | Bearer Token | Current user's expenses |
| `GET` | `/api/expenses?userId=<id>` | Bearer Token | Specific user's expenses |
| `POST` | `/api/expenses` | Bearer Token | Record expense with optional `receiptImage` |
| `DELETE` | `/api/expenses/:id` | Bearer Token | Delete expense (creator or admin) |
| `POST` | `/api/ocr/scan` | Bearer Token | Scan receipt image, extract fields, and store photo |
| `GET` | `/uploads/receipts/:file` | Public | Static serving of bill images |
| `GET` | `/api/summary?userId=all` | Bearer Token | Combined summary + `byUser` distribution |
| `GET` | `/api/health` | Public | Server health, version (1.2.0), and LAN IPs |

---

## 🏷️ Versioning

This project follows [Semantic Versioning (SemVer)](https://semver.org/):
- **Current Version**: `v1.2.0`
- See [CHANGELOG.md](CHANGELOG.md) for full release history.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
