const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { parseReceiptText } = require('./receipt-parser.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-local-wifi-secret-key-2026';

// Multer memory storage for receipt image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max image upload
});

// Receipts Upload Directory Setup
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const RECEIPTS_DIR = path.join(UPLOADS_DIR, 'receipts');
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Database setup
const dbPath = path.join(__dirname, 'expenses.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#4361EE',
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    receipt_image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Migrations: ensure columns exist across version updates
try {
  // Check users table for role column
  const userCols = db.prepare("PRAGMA table_info(users)").all();
  if (!userCols.some(c => c.name === 'role')) {
    console.log('[*] Migrating users table to add role column...');
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
  }

  // Ensure default admin user has admin role
  db.exec("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'admin';");

  // Check expenses table for user_id and receipt_image columns
  const tableCols = db.prepare("PRAGMA table_info(expenses)").all();
  if (!tableCols.some(c => c.name === 'user_id')) {
    console.log('[*] Migrating expenses table to support multi-user...');
    db.exec('ALTER TABLE expenses ADD COLUMN user_id INTEGER DEFAULT 1;');
  }
  if (!tableCols.some(c => c.name === 'receipt_image')) {
    console.log('[*] Migrating expenses table to support receipt images...');
    db.exec("ALTER TABLE expenses ADD COLUMN receipt_image TEXT DEFAULT '';");
  }
} catch (e) {
  console.error('Migration notice:', e.message);
}

// Ensure default demo user exists for easy testing if no users exist
const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (!userCountRow || userCountRow.count === 0) {
  const defaultSalt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('admin123', defaultSalt);
  db.prepare(`
    INSERT INTO users (username, password_hash, full_name, avatar_color, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', defaultHash, 'Admin User', '#4361EE', 'admin');
  console.log('[+] Created default account: username "admin", password "admin123" (role: admin)');
}

// Helper to get local Wi-Fi / LAN IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ name, address: net.address });
      }
    }
  }
  return addresses;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decodedUser;
    next();
  });
}

// Administrator Authorization Middleware
function requireAdmin(req, res, next) {
  const isAdm = req.user && (req.user.role === 'admin' || req.user.username?.toLowerCase() === 'admin');
  if (!isAdm) {
    return res.status(403).json({ error: 'Administrator access required for this action.' });
  }
  next();
}

// --- AUTHENTICATION ROUTES ---

// 1. Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, fullName, avatarColor } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = (fullName && fullName.trim()) ? fullName.trim() : cleanUsername;

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const colorPalette = ['#4361EE', '#3A0CA3', '#7209B7', '#F72585', '#4CC9F0', '#10B981', '#F59E0B', '#EF4444'];
    const color = avatarColor || colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const role = (cleanUsername === 'admin') ? 'admin' : 'user';

    const insertStmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, avatar_color, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(cleanUsername, passwordHash, cleanFullName, color, role);
    const userId = Number(result.lastInsertRowid);

    const userPayload = { id: userId, username: cleanUsername, fullName: cleanFullName, avatarColor: color, role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '90d' });

    console.log(`[+] Registered new user: ${cleanUsername} (#${userId}, role: ${role})`);
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const role = user.role || ((user.username.toLowerCase() === 'admin') ? 'admin' : 'user');

    const userPayload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      avatarColor: user.avatar_color,
      role
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '90d' });

    console.log(`[>] User logged in: ${user.username} (#${user.id}, role: ${role})`);
    res.json({
      message: 'Logged in successfully',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 3. Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, full_name, avatar_color, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      avatarColor: user.avatar_color,
      role: user.role || (user.username === 'admin' ? 'admin' : 'user'),
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get list of all users with individual spending summaries
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        users.id, 
        users.username, 
        users.full_name, 
        users.avatar_color, 
        users.created_at,
        COALESCE(SUM(expenses.amount), 0) as total_spent,
        COUNT(expenses.id) as expense_count
      FROM users
      LEFT JOIN expenses ON users.id = expenses.user_id
      GROUP BY users.id
      ORDER BY total_spent DESC, users.full_name ASC
    `).all();

    const grandTotal = users.reduce((sum, u) => sum + (u.total_spent || 0), 0);
    const enriched = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      avatarColor: u.avatar_color,
      totalSpent: u.total_spent,
      expenseCount: u.expense_count,
      percentage: grandTotal > 0 ? Math.round((u.total_spent / grandTotal) * 100) : 0,
      createdAt: u.created_at
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMINISTRATOR USER MANAGEMENT ROUTES ---

// 4a. Admin: Get all users with full detail
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        users.id, 
        users.username, 
        users.full_name, 
        users.avatar_color, 
        users.role,
        users.created_at,
        COALESCE(SUM(expenses.amount), 0) as total_spent,
        COUNT(expenses.id) as expense_count
      FROM users
      LEFT JOIN expenses ON users.id = expenses.user_id
      GROUP BY users.id
      ORDER BY users.id ASC
    `).all();

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      avatarColor: u.avatar_color,
      role: u.role || 'user',
      totalSpent: parseFloat((u.total_spent || 0).toFixed(2)),
      expenseCount: u.expense_count || 0,
      createdAt: u.created_at
    }));

    res.json(result);
  } catch (err) {
    console.error('Admin users fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4b. Admin: Create new user
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username, password, fullName, avatarColor, role } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const colorPalette = ['#4361EE', '#3A0CA3', '#7209B7', '#F72585', '#4CC9F0', '#10B981', '#F59E0B', '#EF4444'];
    const color = avatarColor || colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const cleanFullName = (fullName && fullName.trim()) ? fullName.trim() : cleanUsername;
    const userRole = (role === 'admin') ? 'admin' : 'user';

    const insertStmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, avatar_color, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(cleanUsername, passwordHash, cleanFullName, color, userRole);
    const userId = Number(result.lastInsertRowid);

    console.log(`[+] Admin @${req.user.username} created new user @${cleanUsername} (#${userId}, role: ${userRole})`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        username: cleanUsername,
        fullName: cleanFullName,
        avatarColor: color,
        role: userRole
      }
    });
  } catch (err) {
    console.error('Admin user creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4c. Admin: Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
    }

    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cascade deletion of expenses is automatic via foreign key ON DELETE CASCADE
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = deleteStmt.run(targetId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User could not be deleted' });
    }

    console.log(`[-] Admin @${req.user.username} deleted user @${targetUser.username} (#${targetId}) and all their expenses`);

    res.json({
      message: `User @${targetUser.username} and all their expenses were deleted successfully.`,
      deletedUserId: targetId
    });
  } catch (err) {
    console.error('Admin user deletion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4d. Admin: Update user profile or reset password
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { fullName, role, avatarColor, password } = req.body;
    const newName = (fullName && fullName.trim()) ? fullName.trim() : targetUser.full_name;
    const newRole = role !== undefined ? ((role === 'admin') ? 'admin' : 'user') : targetUser.role;
    const newColor = avatarColor || targetUser.avatar_color;

    let newHash = targetUser.password_hash;
    if (password && password.length >= 4) {
      const salt = bcrypt.genSaltSync(10);
      newHash = bcrypt.hashSync(password, salt);
    }

    db.prepare(`
      UPDATE users 
      SET full_name = ?, role = ?, avatar_color = ?, password_hash = ?
      WHERE id = ?
    `).run(newName, newRole, newColor, newHash, targetId);

    console.log(`[*] Admin @${req.user.username} updated user @${targetUser.username} (#${targetId})`);

    res.json({
      message: 'User updated successfully',
      user: {
        id: targetId,
        username: targetUser.username,
        fullName: newName,
        avatarColor: newColor,
        role: newRole
      }
    });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GENERAL & HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;

    res.json({
      status: 'ok',
      appName: 'SyncSpend Pro Multiuser OCR Server',
      version: '1.2.0',
      ocrEnabled: true,
      imageUploadsEnabled: true,
      serverTime: new Date().toISOString(),
      userCount,
      expenseCount,
      ips: getLocalIpAddresses().map(i => i.address)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- OCR BILL / RECEIPT SCANNING ROUTE ---
// 5. OCR Scan Receipt / Bill
// Accepts multipart image file 'receipt' or JSON body { imageBase64: '...' }
// Automatically stores the bill photo on the server for future reference!
app.post('/api/ocr/scan', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    let imageBuffer = null;
    let originalFilename = '';

    if (req.file && req.file.buffer) {
      imageBuffer = req.file.buffer;
      originalFilename = req.file.originalname || '';
    } else if (req.body && req.body.imageBase64) {
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!imageBuffer) {
      return res.status(400).json({ error: 'Please upload a receipt image or provide imageBase64' });
    }

    // Determine extension and save receipt picture to server for future reference
    let ext = '.jpg';
    if (originalFilename.toLowerCase().endsWith('.png')) ext = '.png';
    else if (originalFilename.toLowerCase().endsWith('.webp')) ext = '.webp';
    else if (originalFilename.toLowerCase().endsWith('.jpeg')) ext = '.jpg';

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const savedFilename = `bill_${timestamp}_${randomId}${ext}`;
    const destinationPath = path.join(RECEIPTS_DIR, savedFilename);

    fs.writeFileSync(destinationPath, imageBuffer);
    const receiptImagePath = `/uploads/receipts/${savedFilename}`;
    console.log(`[OCR] Saved bill image to server at: ${receiptImagePath} (${Math.round(imageBuffer.length / 1024)} KB)`);

    // Run Tesseract OCR in English with fallback for unparseable images
    let text = '';
    let confidence = 0;
    try {
      const ocrResult = await Tesseract.recognize(imageBuffer, 'eng');
      text = (ocrResult && ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : '';
      confidence = (ocrResult && ocrResult.data && ocrResult.data.confidence) ? ocrResult.data.confidence : 0;
      console.log(`[OCR] Recognition finished (${Math.round(confidence)}% confidence). Extracting receipt data...`);
    } catch (ocrErr) {
      console.warn(`[OCR] Note: Tesseract could not extract text from this image (${ocrErr.message}). Image was still saved successfully.`);
    }

    // Parse extracted text into structured fields (Store Name, Date & Amount)
    const extracted = parseReceiptText(text);
    extracted.confidence = Math.round(confidence);
    extracted.receiptImage = receiptImagePath;

    console.log(`[OCR] Captured from bill: Store "${extracted.storeName}" | Amount: $${extracted.amount} | Date: ${extracted.date} | Receipt: ${receiptImagePath}`);

    // If autoSave flag is set to true, automatically record directly to database with receipt image
    let savedExpense = null;
    if (req.body && (req.body.autoSave === 'true' || req.body.autoSave === true) && extracted.amount > 0) {
      const stmt = db.prepare(`
        INSERT INTO expenses (user_id, title, amount, category, date, notes, receipt_image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(req.user.id, extracted.storeName, extracted.amount, 'General', extracted.date, '', receiptImagePath);
      savedExpense = db.prepare(`
        SELECT expenses.*, users.username, users.full_name, users.avatar_color
        FROM expenses
        LEFT JOIN users ON expenses.user_id = users.id
        WHERE expenses.id = ?
      `).get(Number(result.lastInsertRowid));
      console.log(`[OCR] Auto-saved expense #${savedExpense.id} with bill image for @${req.user.username}`);
    }

    res.json({
      success: true,
      extracted: {
        storeName: extracted.storeName,
        title: extracted.storeName,
        amount: extracted.amount,
        date: extracted.date,
        receiptImage: receiptImagePath,
        confidence: extracted.confidence
      },
      savedExpense,
      autoSaved: !!savedExpense
    });
  } catch (err) {
    console.error('OCR Processing error:', err);
    res.status(500).json({ error: 'Failed to process receipt image: ' + err.message });
  }
});

// --- EXPENSES ROUTES (Combined & Organized by User) ---

// 6. Get expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
  try {
    const { category, search, month, userId } = req.query;
    let sql = `
      SELECT 
        expenses.id, 
        expenses.user_id, 
        expenses.title, 
        expenses.amount, 
        expenses.category, 
        expenses.date, 
        expenses.notes, 
        expenses.receipt_image,
        expenses.created_at,
        users.username, 
        users.full_name, 
        users.avatar_color
      FROM expenses
      LEFT JOIN users ON expenses.user_id = users.id
      WHERE 1=1
    `;
    const params = [];

    if (userId && userId === 'me') {
      sql += ' AND expenses.user_id = ?';
      params.push(req.user.id);
    } else if (userId && userId !== 'all' && !isNaN(parseInt(userId, 10))) {
      sql += ' AND expenses.user_id = ?';
      params.push(parseInt(userId, 10));
    }

    if (category && category !== 'All') {
      sql += ' AND expenses.category = ?';
      params.push(category);
    }
    if (search && search.trim() !== '') {
      sql += ' AND (expenses.title LIKE ? OR expenses.notes LIKE ? OR users.full_name LIKE ? OR users.username LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      sql += ' AND strftime("%Y-%m", expenses.date) = ?';
      params.push(month);
    }

    sql += ' ORDER BY expenses.date DESC, expenses.id DESC';

    const expenses = db.prepare(sql).all(...params);
    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Add new expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  try {
    const { title, amount, category, date, notes, receiptImage, receipt_image } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const expenseDate = date || new Date().toISOString().split('T')[0];
    const expenseCategory = category || 'General';
    const expenseNotes = notes ? notes.trim() : '';
    const storedReceiptImage = (receiptImage || receipt_image || '').trim();

    const stmt = db.prepare(`
      INSERT INTO expenses (user_id, title, amount, category, date, notes, receipt_image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.user.id, title.trim(), numericAmount, expenseCategory, expenseDate, expenseNotes, storedReceiptImage);
    const newId = Number(result.lastInsertRowid);

    const newExpense = db.prepare(`
      SELECT expenses.*, users.username, users.full_name, users.avatar_color
      FROM expenses
      LEFT JOIN users ON expenses.user_id = users.id
      WHERE expenses.id = ?
    `).get(newId);

    console.log(`[+] Added expense #${newId} for user @${req.user.username}: "${title}" - $${numericAmount.toFixed(2)}${storedReceiptImage ? ' [Attached Bill]' : ''}`);

    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error inserting expense:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const isAdm = req.user && (req.user.role === 'admin' || req.user.username?.toLowerCase() === 'admin');
    let stmt;
    let result;
    if (isAdm) {
      stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
      result = stmt.run(id);
    } else {
      stmt = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
      result = stmt.run(id, req.user.id);
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    console.log(`[-] Deleted expense #${id} by user @${req.user.username}`);
    res.json({ message: 'Expense deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Get summary & analytics
app.get('/api/summary', authenticateToken, (req, res) => {
  try {
    const { userId, month } = req.query;
    const currentMonth = month || new Date().toISOString().substring(0, 7); // YYYY-MM
    const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

    let userFilter = '';
    const filterParams = [];

    if (userId && userId === 'me') {
      userFilter = ' AND user_id = ?';
      filterParams.push(req.user.id);
    } else if (userId && userId !== 'all' && !isNaN(parseInt(userId, 10))) {
      userFilter = ' AND user_id = ?';
      filterParams.push(parseInt(userId, 10));
    }

    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE 1=1 ${userFilter}
    `).get(...filterParams);

    const monthRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE strftime("%Y-%m", date) = ? ${userFilter}
    `).get(currentMonth, ...filterParams);

    const todayRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE date = ? ${userFilter}
    `).get(today, ...filterParams);

    const categoryRows = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE 1=1 ${userFilter}
      GROUP BY category 
      ORDER BY total DESC
    `).all(...filterParams);

    const total = totalRow.total || 0;
    const categoryStats = categoryRows.map(row => ({
      category: row.category,
      total: row.total,
      count: row.count,
      percentage: total > 0 ? Math.round((row.total / total) * 100) : 0
    }));

    const userBreakdownRows = db.prepare(`
      SELECT 
        users.id as user_id, 
        users.username, 
        users.full_name, 
        users.avatar_color,
        COALESCE(SUM(expenses.amount), 0) as total,
        COUNT(expenses.id) as count
      FROM users
      LEFT JOIN expenses ON users.id = expenses.user_id
      GROUP BY users.id
      ORDER BY total DESC, users.full_name ASC
    `).all();

    const grandTotal = userBreakdownRows.reduce((sum, u) => sum + (u.total || 0), 0);
    const userStats = userBreakdownRows.map(u => ({
      userId: u.user_id,
      username: u.username,
      fullName: u.full_name,
      avatarColor: u.avatar_color,
      total: u.total,
      count: u.count,
      percentage: grandTotal > 0 ? Math.round((u.total / grandTotal) * 100) : 0
    }));

    const recentRows = db.prepare(`
      SELECT 
        expenses.*, users.username, users.full_name, users.avatar_color
      FROM expenses 
      LEFT JOIN users ON expenses.user_id = users.id
      WHERE 1=1 ${userFilter}
      ORDER BY date DESC, expenses.id DESC 
      LIMIT 5
    `).all(...filterParams);

    res.json({
      scope: userId ? (userId === 'all' ? 'combined' : (userId === 'me' ? 'personal' : `user-${userId}`)) : 'combined',
      totalSpent: totalRow.total,
      totalCount: totalRow.count,
      thisMonthSpent: monthRow.total,
      thisMonthCount: monthRow.count,
      todaySpent: todayRow.total,
      grandTotal: grandTotal,
      byCategory: categoryStats,
      byUser: userStats,
      recent: recentRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Process safety handlers
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n=============================================================');
  console.log('   SYNCSPEND PRO • MULTIUSER OCR SERVER RUNNING (v1.2.0)');
  console.log('   [+] Full Admin Control of Users & Persistent Bill Storage');
  console.log('=============================================================');
  console.log(`  > Local Machine:  http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`  > Wi-Fi / Mobile: http://${ip.address}:${PORT}`);
    console.log(`  > API Endpoint:   http://${ip.address}:${PORT}/api/expenses`);
    console.log(`  > OCR Scanner:    http://${ip.address}:${PORT}/api/ocr/scan`);
    console.log(`  > Receipts Dir:   http://${ip.address}:${PORT}/uploads/receipts/`);
  });
  console.log('  > Default Account: admin / admin123 (or register in app)');
  console.log('=============================================================\n');
});
