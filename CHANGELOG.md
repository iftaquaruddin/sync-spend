# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.3.0] - 2026-11-13

### Added
- **Multi-Platform Docker & Docker Compose Containerization**:
  - Production `Dockerfile` based on Node.js 22 LTS (`node:22-bookworm-slim`) with native SQLite and WebAssembly OCR support.
  - Multi-architecture container compatibility: `linux/amd64` (Intel/AMD) and `linux/arm64` (Raspberry Pi, Apple Silicon, ARM cloud instances).
  - Production-ready `docker-compose.yml` with named persistent storage (`syncspend_data`) for database and bill photo uploads.
  - Non-root user execution (`node`) with `dumb-init` for PID 1 signal forwarding and zombie process reaping.
  - Native zero-dependency health check using Node 22 built-in `fetch` API.
  - Graceful shutdown handlers for `SIGTERM` and `SIGINT` to cleanly close SQLite transactions.
  - Comprehensive platform deployment documentation ([docs/DOCKER.md](docs/DOCKER.md)) for Synology, QNAP, Unraid, TrueNAS, CasaOS, Linux VPS, and Cloud Containers.
- **Record Editing by Admin & Record Creator**:
  - Full update capability for transaction records via `PUT /api/expenses/:id`.
  - Authorized access control: allows updating if user is the original creator or has administrative privileges.
  - Supports modifying store/merchant name, amount, category, transaction date, notes, and attached receipt bill image.
  - Web Dashboard:
    - Added inline `✏️` edit action button for authorized users on each transaction row.
    - Sleek modal dialog for editing expenses with pre-filled inputs and receipt image management.
  - Flutter Mobile App:
    - Added edit icon button on transaction cards for owners and admins.
    - Interactive bottom sheet for editing transactions with live date picker, category dropdown, amount editing, and receipt management.
- **Executive Analytics & Interactive Charts**:
  - Dynamic analytics endpoint (`GET /api/charts`) supporting customizable timeframes:
    - `week` (last 7 days, daily buckets)
    - `month` (last 30 days, daily buckets)
    - `year` (current calendar year, monthly buckets)
    - `all` (all-time history, monthly buckets)
    - Flexible scope filtering by all users combined, current authenticated user, or specific user ID.
    - Calculates period total, total transaction volume, average transaction size, and category share.
    - Generates user-comparative timeline data series across all household/team members.
  - Web Dashboard:
    - Integrated **Chart.js** data visualization library.
    - View Mode Switcher:
      - **Timeline Trend**: Smooth area line chart tracking spending velocity over time with gradient fills.
      - **User Comparison**: Multi-user comparative bar charts allowing admins to compare spending across members.
      - **Category Share**: Modern donut chart highlighting category proportions.
    - Timeframe selector pill buttons (`7 Days`, `30 Days`, `This Year`, `All Time`).
    - User scope dropdown selector allowing admins to inspect any user or view all users combined.
    - Real-time theme synchronization: chart gridlines, labels, and tooltips automatically update when toggling dark/light mode.
    - Summary KPI cards showing period spend, volume, and average ticket size.
  - Flutter Mobile App:
    - Upgraded Analytics tab with timeframe filter chips (`7 Days`, `30 Days`, `This Year`, `All Time`).
    - Summary KPI metrics (Period Total, Transactions, Average Transaction).
    - Category spending distribution with progress bars and percentage share.
- **FinTech Executive UI Polish**:
  - Premium typography, elevation shadows, tabular numeric alignment (`font-variant-numeric: tabular-nums`), and glassmorphism app bar.
  - Refined status badges, segmented pill controls, and responsive grid layouts.

## [v1.2.0] - 2026-11-13

### Added
- **Full Administrator Control of Users**:
  - Role-based authorization (`admin` vs `user`) with admin-protected endpoints (`/api/admin/users`).
  - Administrator user management capabilities:
    - View all registered users with their spend totals and transaction counts (`GET /api/admin/users`).
    - Provision new user accounts with assigned username, full name, password, role, and avatar accent color (`POST /api/admin/users`).
    - Delete user accounts with automatic cascading deletion of all associated expenses (`DELETE /api/admin/users/:id`).
    - Edit user full name, role, avatar color, or reset password (`PUT /api/admin/users/:id`).
    - Built-in self-deletion protection to guarantee the active admin account is never deleted.
  - Web Dashboard: dedicated **Admin Control Panel** tab showing total user metrics, storage mode, and full user CRUD interface.
  - Flutter Mobile App: dedicated **Admin** navigation destination with user management dashboard, "+ Add User" bottom sheet, and confirmation dialogs.
- **Persistent Bill Photo Upload & Permanent Server Storage**:
  - Automatic saving of receipt and bill images to disk on the local server (`server/uploads/receipts/bill_<timestamp>_<id>.<ext>`).
  - Added `expenses.receipt_image` database column linking the expense directly to the stored receipt image path.
  - Static file hosting (`/uploads/receipts/*`) with cross-origin caching.
  - Web Dashboard:
    - Attached bill preview chip in Add Expense form with instant thumbnail and remove option.
    - Clickable `🧾 View Bill` pill on transaction cards opening an interactive lightbox modal with full-resolution link.
  - Flutter Mobile App:
    - Smart bill attachment preview chip with thumbnail upon OCR scan completion.
    - Clickable `🧾` receipt button on transaction items opening a modal with pinch-to-zoom (`InteractiveViewer`), high-resolution rendering, and smooth loading indicators.
- **Resilient Server Exception Handling**:
  - Global `uncaughtException` and `unhandledRejection` guards to protect server uptime.
  - Graceful fallback for OCR recognition errors so receipt images are always safely preserved even if text is unreadable or blurry.

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
