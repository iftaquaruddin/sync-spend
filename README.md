# 💸 SyncSpend

[![Release](https://img.shields.io/badge/Release-v1.0.0-4361EE.svg)](https://github.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.44+-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **A privacy-first, multi-user expense tracking system that connects mobile phones (Android & iPhone) to your local server over Wi-Fi. Features both combined household/team totals and individual member ledgers with no cloud accounts or subscriptions required.**

---

## 🌟 Highlights

- **👥 Combined & User-Organized Ledgers**:
  - **Combined (All Users)**: View unified household/team totals, monthly spending, and category distribution.
  - **Personal Ledgers**: View personal spending or filter by any specific member with one tap.
  - **"By User" Leaderboard**: See who spent how much, transaction counts, and percentage share of combined total with visual progress bars.
  - **User Attribution**: Color-coded member badges on every transaction item.
- **🔐 Secure Multi-User Auth**:
  - `bcrypt` password hashing and `JWT` token authentication.
  - Default `admin` account with self-registration for unlimited family or team members.
- **📶 Local Wi-Fi Sync**:
  - Zero cloud dependencies — all data stays on your local machine in `expenses.db`.
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
│  │  JWT & Bcrypt Auth    │  │  Multi-User API       │  │ Web Dashboard   │  │
│  │  /api/auth/login      │  │  Combined / Personal  │  │ /public         │  │
│  │  /api/auth/register   │  │  /api/expenses        │  │ Live UI & PWA   │  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └─────────────────┘  │
│             │                           │                                   │
│             ▼                           ▼                                   │
│  ┌──────────────────────────────────────────────────┐                       │
│  │           Embedded SQLite Database               │                       │
│  │     users table  ◄──────►  expenses table        │                       │
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
   EXPENSEHUB PRO • MULTIUSER LOCAL SERVER RUNNING
=============================================================
  > Local Machine:  http://localhost:3000
  > Wi-Fi / Mobile: http://10.0.0.184:3000
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
| `GET` | `/api/users` | Bearer Token | List all users with spend totals and % share |
| `GET` | `/api/expenses?userId=all` | Bearer Token | Combined expenses across all users |
| `GET` | `/api/expenses?userId=me` | Bearer Token | Current user's expenses |
| `GET` | `/api/expenses?userId=<id>` | Bearer Token | Specific user's expenses |
| `POST` | `/api/expenses` | Bearer Token | Record new expense (attributed to logged-in user) |
| `DELETE` | `/api/expenses/:id` | Bearer Token | Delete expense (creator or admin) |
| `GET` | `/api/summary?userId=all` | Bearer Token | Combined summary + `byUser` distribution |
| `GET` | `/api/health` | Public | Server health, user count, and LAN IPs |

---

## 🏷️ Versioning

This project follows [Semantic Versioning (SemVer)](https://semver.org/):
- **Current Version**: `v1.0.0`
- See [CHANGELOG.md](CHANGELOG.md) for full release history.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
