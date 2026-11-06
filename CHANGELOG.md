# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.0] - 2026-11-05

### Added
- **AI / OCR Bill & Receipt Scanning Engine**:
  - Pure JavaScript / WebAssembly OCR engine powered by `tesseract.js` on the local server — zero external C++ dependencies required.
  - Multipart and base64 receipt upload endpoint (`POST /api/ocr/scan`).
  - Intelligent receipt parser (`receipt-parser.js`):
    - Automatically extracts total amount using weighted heuristics (avoids subtotal, tax, cash, change).
    - Detects merchant names from header lines.
    - Normalizes dates into standard ISO `YYYY-MM-DD` format.
    - Suggests category classification (`Food & Dining`, `Groceries`, `Travel & Transportation`, `Utilities`, `Healthcare`, etc.) based on merchant keywords.
    - Calculates confidence score percentage.
    - Optional `autoSave: true` flag to directly persist parsed transactions into SQLite.
- **Mobile OCR Bill Scanner (Flutter)**:
  - Smart Scanner card integrated into the Add Expense tab.
  - Image picker dialog allowing direct camera capture (`ImageSource.camera`) or file gallery selection (`ImageSource.gallery`).
  - Live scanning progress indicator and instant extraction feedback badge with pre-filled amount, merchant, date, and category.
  - Added Android permissions for camera and media access (`CAMERA`, `READ_MEDIA_IMAGES`).
- **Web & iPhone PWA Receipt Scanner**:
  - Instant camera capture support via `<input type="file" accept="image/*" capture="environment">`.
  - Drag-and-drop or tap-to-upload scanner banner with live progress animations and auto-fill into the expense entry form.

## [v1.0.0] - 2026-11-05

### Added
- **Multi-User Authentication**:
  - Secure password hashing using `bcryptjs`.
  - Stateless JSON Web Token (`JWT`) bearer authorization.
  - Automatic `admin` account provisioning and open user self-registration.
- **Combined & User-Organized Expense Management**:
  - Dual-scope views: **Combined (All Users)** and **Personal (My Expenses)**.
  - One-tap member filter chips for drill-down into individual ledgers.
  - Dedicated **"By User"** spending leaderboard with progress distribution bars and % contribution calculations.
  - Color-coded user badges on all transactions.
- **Node.js Local Server**:
  - Embedded SQLite database with automatic table creation and foreign key constraints.
  - LAN / Wi-Fi IP auto-detection (`http://10.0.0.184:3000`).
  - Full REST API with endpoints for auth, health, expenses, user summaries, and category metrics.
- **Flutter Cross-Platform Mobile App**:
  - Material 3 design with executive indigo & slate palette.
  - 4 core views: Add Expense, Transactions History, By User, and Category Insights.
  - Quick-amount adder chips (`+$5`, `+$10`, `+$25`, `+$50`, `+$100`) and merchant tags.
  - Real-time Wi-Fi status indicator with 1-click IP reconfiguration.
- **Progressive Web App (PWA)**:
  - Full-screen standalone web dashboard optimized for iPhone Safari (*Add to Home Screen*) and desktop browsers.
