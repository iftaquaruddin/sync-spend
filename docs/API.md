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

### Edit / Update Expense
- **Method**: `PUT`
- **Endpoint**: `/api/expenses/:id`
- **Access**: Authenticated (Expense owner or `admin`)
- **Request Body**:
  ```json
  {
    "title": "Whole Foods Market",
    "amount": 54.20,
    "category": "Groceries",
    "date": "2026-11-13",
    "notes": "Weekly household groceries",
    "receiptImage": "/uploads/receipts/bill_1763067584123_abc123.jpg"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": "Expense updated successfully",
    "expense": {
      "id": 12,
      "user_id": 2,
      "title": "Whole Foods Market",
      "amount": 54.2,
      "category": "Groceries",
      "date": "2026-11-13",
      "notes": "Weekly household groceries",
      "receipt_image": "/uploads/receipts/bill_1763067584123_abc123.jpg",
      "username": "sarah",
      "full_name": "Sarah Connor"
    }
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

### Dynamic Charts & Analytics
- **Method**: `GET`
- **Endpoint**: `/api/charts`
- **Access**: Authenticated
- **Query Parameters**:
  - `timeframe`: `week` (7 days), `month` (30 days), `year` (calendar year), `all` (all time)
  - `userId`: `all` (combined), `me` (current user), or specific user ID integer
- **Response `200 OK`**:
  ```json
  {
    "timeframe": "month",
    "userId": "all",
    "periodTotal": 248.50,
    "totalSpent": 248.50,
    "totalCount": 13,
    "buckets": ["2026-11-05", "2026-11-12", "2026-11-13"],
    "timeline": [
      { "bucket": "2026-11-05", "total": 86.40, "count": 3 },
      { "bucket": "2026-11-13", "total": 162.10, "count": 10 }
    ],
    "userSeries": [
      {
        "userId": 1,
        "username": "admin",
        "fullName": "Admin User",
        "avatarColor": "#4361EE",
        "data": [43.20, 0, 80.00]
      }
    ],
    "byCategory": [
      { "category": "Groceries", "total": 120.00, "count": 5, "percentage": 48 }
    ],
    "byUser": [
      {
        "userId": 1,
        "username": "admin",
        "fullName": "Admin User",
        "avatarColor": "#4361EE",
        "total": 123.20,
        "count": 6,
        "percentage": 50
      }
    ]
  }
  ```
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
    "receiptImage": "/uploads/receipts/bill_1794599819209_d1rcu42.png",
    "extracted": {
      "storeName": "Starbucks Coffee",
      "title": "Starbucks Coffee",
      "amount": 14.85,
      "date": "2026-11-05",
      "receiptImage": "/uploads/receipts/bill_1794599819209_d1rcu42.png",
      "confidence": 88
    },
    "autoSaved": false
  }
  ```

### Static Bill Photo Access
- **Method**: `GET`
- **Endpoint**: `/uploads/receipts/:filename`
- **Access**: Public / Authenticated (Served statically from `server/uploads/receipts/`)
- **Headers**: Returns `Content-Type: image/jpeg` or `image/png` with `Cache-Control: max-age=86400`

---

## 6. Admin User Management Endpoints (Admin Only)

All endpoints in this section require `role === 'admin'` or user `admin`.

### Get All Users
- **Method**: `GET`
- **Endpoint**: `/api/admin/users`
- **Access**: Admin only (`Bearer <token>`)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "avatar_color": "#4361EE",
      "role": "admin",
      "created_at": "2026-11-05 10:00:00",
      "expense_count": 8,
      "total_spent": 128.50
    },
    {
      "id": 2,
      "username": "sarah",
      "full_name": "Sarah Connor",
      "avatar_color": "#10B981",
      "role": "user",
      "created_at": "2026-11-05 10:30:00",
      "expense_count": 4,
      "total_spent": 49.99
    }
  ]
  ```

### Create New User (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/admin/users`
- **Access**: Admin only (`Bearer <token>`)
- **Request Body**:
  ```json
  {
    "username": "alex",
    "fullName": "Alex Rivera",
    "password": "securepassword",
    "role": "user",
    "avatarColor": "#8B5CF6"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "User created successfully by administrator",
    "user": {
      "id": 3,
      "username": "alex",
      "fullName": "Alex Rivera",
      "avatarColor": "#8B5CF6",
      "role": "user"
    }
  }
  ```

### Delete User (Admin)
- **Method**: `DELETE`
- **Endpoint**: `/api/admin/users/:id`
- **Access**: Admin only (`Bearer <token>`)
- **Behavior**:
  - Automatically cascades and deletes all expenses belonging to this user.
  - Returns `400 Bad Request` if an administrator attempts to delete their own logged-in account.
- **Response `200 OK`**:
  ```json
  {
    "message": "User @alex and all their expenses were deleted successfully.",
    "deletedUserId": 3
  }
  ```

### Update User (Admin)
- **Method**: `PUT`
- **Endpoint**: `/api/admin/users/:id`
- **Access**: Admin only (`Bearer <token>`)
- **Request Body**:
  ```json
  {
    "fullName": "Alex Rivera Jr.",
    "role": "admin",
    "avatarColor": "#EC4899",
    "newPassword": "newoptionalpassword"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": "User updated successfully",
    "user": {
      "id": 3,
      "username": "alex",
      "fullName": "Alex Rivera Jr.",
      "avatarColor": "#EC4899",
      "role": "admin"
    }
  }
  ```
