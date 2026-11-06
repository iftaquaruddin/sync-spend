# SyncSpend • REST API Specification

This document details all REST API endpoints available in the SyncSpend server.

**Base URL**: `http://<server-ip>:3000/api`  
**Authentication**: Bearer Token via `Authorization: Bearer <JWT>`

---

## 1. Authentication Endpoints

### Register New User
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "sarah",
    "password": "password123",
    "fullName": "Sarah Connor",
    "avatarColor": "#4361EE"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Account created successfully",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 2,
      "username": "sarah",
      "fullName": "Sarah Connor",
      "avatarColor": "#4361EE"
    }
  }
  ```

### User Login
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": "Logged in successfully",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "Admin User",
      "avatarColor": "#4361EE"
    }
  }
  ```

### Current User Profile
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Access**: Authenticated (`Bearer <token>`)

---

## 2. User & Directory Endpoints

### List All Users (Organized by User)
- **Method**: `GET`
- **Endpoint**: `/api/users`
- **Access**: Authenticated
- **Description**: Returns all registered members with their individual total spending, expense count, and percentage share of combined spending.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 2,
      "username": "sarah",
      "fullName": "Sarah Connor",
      "avatarColor": "#4361EE",
      "totalSpent": 49.99,
      "expenseCount": 1,
      "percentage": 53
    },
    {
      "id": 1,
      "username": "admin",
      "fullName": "Admin User",
      "avatarColor": "#4361EE",
      "totalSpent": 24.50,
      "expenseCount": 2,
      "percentage": 26
    }
  ]
  ```

---

## 3. Expenses Endpoints

### Get Expenses (Combined or Filtered by User)
- **Method**: `GET`
- **Endpoint**: `/api/expenses`
- **Access**: Authenticated
- **Query Parameters**:
  - `userId`: 
    - `all` (default) -> Combined expenses across all users
    - `me` -> Scoped to current authenticated user
    - `<number>` -> Scoped to specific user ID
  - `category`: Filter by category (e.g. `Food & Dining`, `Transport`, `Groceries`)
  - `search`: Filter by merchant, title, or user name
  - `month`: Format `YYYY-MM` (e.g. `2026-11`)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 3,
      "user_id": 2,
      "title": "Design Software",
      "amount": 49.99,
      "category": "Bills & Utilities",
      "date": "2026-11-03",
      "notes": "Annual plan",
      "username": "sarah",
      "full_name": "Sarah Connor",
      "avatar_color": "#4361EE"
    }
  ]
  ```

### Add Expense
- **Method**: `POST`
- **Endpoint**: `/api/expenses`
- **Access**: Authenticated
- **Request Body**:
  ```json
  {
    "title": "Groceries",
    "amount": 42.50,
    "category": "Groceries",
    "date": "2026-11-05",
    "notes": "Supermarket"
  }
  ```

### Delete Expense
- **Method**: `DELETE`
- **Endpoint**: `/api/expenses/:id`
- **Access**: Authenticated (User must own the expense or be `admin`)

---

## 4. Summary & Analytics

### Get Spending Summary
- **Method**: `GET`
- **Endpoint**: `/api/summary`
- **Access**: Authenticated
- **Query Parameters**: `userId` (`all`, `me`, `<id>`)
- **Response `200 OK`**:
  ```json
  {
    "scope": "combined",
    "totalSpent": 94.49,
    "totalCount": 4,
    "thisMonthSpent": 94.49,
    "todaySpent": 20.00,
    "byCategory": [
      { "category": "Bills & Utilities", "total": 49.99, "count": 1, "percentage": 53 },
      { "category": "Transport", "total": 20.00, "count": 1, "percentage": 21 }
    ],
    "byUser": [
      { "userId": 2, "fullName": "Sarah Connor", "total": 49.99, "percentage": 53 },
      { "userId": 1, "fullName": "Admin User", "total": 24.50, "percentage": 26 }
    ]
  }
  ```

---

## 5. OCR Bill & Receipt Scanning

### Scan Bill or Receipt Image
- **Method**: `POST`
- **Endpoint**: `/api/ocr/scan`
- **Access**: Authenticated
- **Content-Type**: `multipart/form-data` (with file field `receipt` or `image`) OR `application/json` (with base64 string `imageBase64`)
- **Query / Form Parameters**:
  - `autoSave`: `true` | `false` (optional, default `false`). If `true`, immediately persists the extracted expense under the authenticated user.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Receipt processed successfully",
    "extracted": {
      "title": "Starbucks Coffee",
      "amount": 14.85,
      "category": "Food & Dining",
      "date": "2026-11-05",
      "confidence": 88
    },
    "autoSaved": false,
    "rawTextSnippet": "STARBUCKS #1024\nDATE: 11/05/2026\nCARAMEL MACCHIATO 6.25\n..."
  }
  ```
