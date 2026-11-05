const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-local-wifi-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Migration: check if expenses table was created in older version without user_id
try {
  const tableCols = db.prepare("PRAGMA table_info(expenses)").all();
  const hasUserId = tableCols.some(c => c.name === 'user_id');
  if (!hasUserId) {
    console.log('[*] Migrating expenses table to support multi-user...');
    db.exec('ALTER TABLE expenses ADD COLUMN user_id INTEGER DEFAULT 1;');
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
    INSERT INTO users (username, password_hash, full_name, avatar_color)
    VALUES (?, ?, ?, ?)
  `).run('admin', defaultHash, 'Admin User', '#4361EE');
  console.log('[+] Created default account: username "admin", password "admin123"');
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

    // Check if username taken
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const colorPalette = ['#4361EE', '#3A0CA3', '#7209B7', '#F72585', '#4CC9F0', '#10B981', '#F59E0B', '#EF4444'];
    const color = avatarColor || colorPalette[Math.floor(Math.random() * colorPalette.length)];

    const insertStmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, avatar_color)
      VALUES (?, ?, ?, ?)
    `);
    const result = insertStmt.run(cleanUsername, passwordHash, cleanFullName, color);
    const userId = Number(result.lastInsertRowid);

    const userPayload = { id: userId, username: cleanUsername, fullName: cleanFullName, avatarColor: color };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '90d' });

    console.log(`[+] Registered new user: ${cleanUsername} (#${userId})`);
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

    const userPayload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      avatarColor: user.avatar_color
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '90d' });

    console.log(`[>] User logged in: ${user.username} (#${user.id})`);
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
    const user = db.prepare('SELECT id, username, full_name, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      avatarColor: user.avatar_color,
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get list of all users with individual spending summaries (For user filtering and comparisons)
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

// --- GENERAL & HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;

    res.json({
      status: 'ok',
      appName: 'ExpenseHub Pro Multiuser Server',
      serverTime: new Date().toISOString(),
      userCount,
      expenseCount,
      ips: getLocalIpAddresses().map(i => i.address)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES ROUTES (Supports both COMBINED and ORGANIZED BY USER) ---

// 5. Get expenses (Supports: userId='all' for combined, userId='me' for current user, or userId=<id> for specific user)
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
        expenses.created_at,
        users.username, 
        users.full_name, 
        users.avatar_color
      FROM expenses
      LEFT JOIN users ON expenses.user_id = users.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by user if requested (defaults to 'all' for combined view, or 'me' for personal view)
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

// 6. Add new expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  try {
    const { title, amount, category, date, notes } = req.body;

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

    const stmt = db.prepare(`
      INSERT INTO expenses (user_id, title, amount, category, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.user.id, title.trim(), numericAmount, expenseCategory, expenseDate, expenseNotes);
    const newId = Number(result.lastInsertRowid);

    const newExpense = db.prepare(`
      SELECT expenses.*, users.username, users.full_name, users.avatar_color
      FROM expenses
      LEFT JOIN users ON expenses.user_id = users.id
      WHERE expenses.id = ?
    `).get(newId);

    console.log(`[+] Added expense #${newId} for user @${req.user.username}: "${title}" - $${numericAmount.toFixed(2)}`);

    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error inserting expense:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete expense (Only creator or admin can delete)
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    // Admins can delete any, standard users can delete their own
    let stmt;
    let result;
    if (req.user.username === 'admin') {
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

// 8. Get summary & analytics (Combined & User-Organized)
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

    // Filtered or Combined total
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE 1=1 ${userFilter}
    `).get(...filterParams);

    // Current month total
    const monthRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE strftime("%Y-%m", date) = ? ${userFilter}
    `).get(currentMonth, ...filterParams);

    // Today total
    const todayRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM expenses 
      WHERE date = ? ${userFilter}
    `).get(today, ...filterParams);

    // Category breakdown
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

    // User breakdown (ALWAYS ORGANIZED BY USER)
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

    // Recent 5 expenses with user info
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

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n=============================================================');
  console.log('   EXPENSEHUB PRO • MULTIUSER LOCAL SERVER RUNNING');
  console.log('=============================================================');
  console.log(`  > Local Machine:  http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`  > Wi-Fi / Mobile: http://${ip.address}:${PORT}`);
    console.log(`  > API Endpoint:   http://${ip.address}:${PORT}/api/expenses`);
  });
  console.log('  > Default Account: admin / admin123 (or register in app)');
  console.log('=============================================================\n');
});
