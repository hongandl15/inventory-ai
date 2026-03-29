import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { seed } from './seed.js';
// import { Configuration, OpenAIApi } from 'openai'; // Uncomment when API key is set

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./inventory.db');

const JWT_SECRET = process.env.JWT_SECRET || 'inventory_secret_change_me';

// Create tables if not exist (add warehouse support and user-warehouse mapping)
const initSQL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sku TEXT,
  quantity INTEGER,
  warehouse_id INTEGER
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  type TEXT,
  amount INTEGER,
  date TEXT,
  warehouse_id INTEGER,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  quantity INTEGER,
  unit_price REAL,
  total REAL,
  date TEXT,
  warehouse_id INTEGER,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT
);
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  location TEXT
);
CREATE TABLE IF NOT EXISTS user_warehouses (
  user_id INTEGER,
  warehouse_id INTEGER,
  PRIMARY KEY(user_id, warehouse_id)
);
`;
db.exec(initSQL);

// small async helpers for migrations
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve(this);
  }));
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  }));
}

// Run lightweight migrations: add warehouse_id columns if missing
async function migrateIfNeeded() {
  try {
    const pcols = await allAsync("PRAGMA table_info(products)");
    const pnames = pcols.map(c => c.name);
    if (!pnames.includes('warehouse_id')) {
      console.log('Migrating: adding warehouse_id to products');
      await runAsync('ALTER TABLE products ADD COLUMN warehouse_id INTEGER');
    }
    const tcols = await allAsync("PRAGMA table_info(transactions)");
    const tnames = tcols.map(c => c.name);
    if (!tnames.includes('warehouse_id')) {
      console.log('Migrating: adding warehouse_id to transactions');
      await runAsync('ALTER TABLE transactions ADD COLUMN warehouse_id INTEGER');
    }
  } catch (err) {
    console.error('Migration check failed:', err.message || err);
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// helper: check if user has access to a warehouse
function userHasWarehouseAccess(userId, warehouseId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?', [userId, warehouseId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
}

// API: Get all products (optionally filter by warehouse)
app.get('/api/products', (req, res) => {
  const { warehouse_id } = req.query;
  if (warehouse_id) {
    db.all('SELECT * FROM products WHERE warehouse_id = ?', [warehouse_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

// API: Add product
app.post('/api/products', (req, res) => {
  const { name, sku, quantity, warehouse_id } = req.body;
  db.run('INSERT INTO products (name, sku, quantity, warehouse_id) VALUES (?, ?, ?, ?)', [name, sku, quantity, warehouse_id || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// API: Update product quantity
app.put('/api/products/:id', (req, res) => {
  const { quantity } = req.body;
  db.run('UPDATE products SET quantity = ? WHERE id = ?', [quantity, req.params.id], function(err2) {
    if (err2) return res.status(500).json({ error: err2.message });
    res.json({ updated: this.changes });
  });
});
// API: Edit product info
app.put('/api/products/:id/edit', (req, res) => {
  const { name, sku } = req.body;
  db.run('UPDATE products SET name = ?, sku = ? WHERE id = ?', [name, sku, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// API: Delete product
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// API: Get product detail
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// API: Get transactions by product
app.get('/api/transactions/:product_id', (req, res) => {
  db.all('SELECT * FROM transactions WHERE product_id = ?', [req.params.product_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Record transaction (in/out)
app.post('/api/transactions', (req, res) => {
  const { product_id, type, amount } = req.body;
  const date = new Date().toISOString();
  db.get('SELECT warehouse_id FROM products WHERE id = ?', [product_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const wid = row ? row.warehouse_id : null;
    db.run('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [product_id, type, amount, date, wid], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      // Update product quantity
      db.run('UPDATE products SET quantity = quantity + ? WHERE id = ?', [type === 'in' ? amount : -amount, product_id]);
      res.json({ id: this.lastID });
    });
  });
});

// API: Record a sale (reduces product quantity, stores revenue info)
app.post('/api/sales', (req, res) => {
  const { product_id, quantity, unit_price } = req.body;
  if (!product_id || !quantity || !unit_price) return res.status(400).json({ error: 'Missing fields' });
  const date = new Date().toISOString();
  const total = Number(quantity) * Number(unit_price);
  db.get('SELECT warehouse_id FROM products WHERE id = ?', [product_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const wid = row ? row.warehouse_id : null;
    db.run('INSERT INTO sales (product_id, quantity, unit_price, total, date, warehouse_id) VALUES (?, ?, ?, ?, ?, ?)', [product_id, quantity, unit_price, total, date, wid], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      // decrement stock
      db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, product_id]);
      res.json({ id: this.lastID, total });
    });
  });
});

// API: Get sales (optionally filter by date range or warehouse)
app.get('/api/sales', (req, res) => {
  const { from, to, warehouse_id } = req.query;
  let sql = 'SELECT s.*, p.name as product_name, p.sku as product_sku, w.name as warehouse_name FROM sales s LEFT JOIN products p ON p.id = s.product_id LEFT JOIN warehouses w ON w.id = s.warehouse_id';
  const params = [];
  const conds = [];
  if (from) { conds.push('s.date >= ?'); params.push(from); }
  if (to) { conds.push('s.date <= ?'); params.push(to); }
  if (warehouse_id) { conds.push('s.warehouse_id = ?'); params.push(warehouse_id); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY s.date DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Revenue summary by date range and optional warehouse/product
app.get('/api/revenue/summary', (req, res) => {
  const { from, to, warehouse_id, product_id } = req.query;
  let sql = 'SELECT SUM(total) as revenue, COUNT(*) as sales_count FROM sales WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  if (warehouse_id) { sql += ' AND warehouse_id = ?'; params.push(warehouse_id); }
  if (product_id) { sql += ' AND product_id = ?'; params.push(product_id); }
  db.get(sql, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { revenue: 0, sales_count: 0 });
  });
});

// API: Get transactions
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// AI: Natural language query (placeholder)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/ai', async (req, res) => {
  const { query } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: query }]
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// API: Search products
app.get('/api/products/search', (req, res) => {
  const { q } = req.query;
  db.all('SELECT * FROM products WHERE name LIKE ? OR sku LIKE ?', [`%${q}%`, `%${q}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Inventory summary report
app.get('/api/report/summary', (req, res) => {
  db.all('SELECT name, sku, quantity FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Transaction report by date
app.get('/api/report/transactions', (req, res) => {
  const { from, to } = req.query;
  db.all('SELECT * FROM transactions WHERE date >= ? AND date <= ?', [from, to], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// User management (register/login) with password hashing and JWT
app.post('/api/users/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hashed = bcrypt.hashSync(password, 8);
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, role || 'user'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const match = bcrypt.compareSync(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, id: row.id, username: row.username, role: row.role });
  });
});

// Warehouse endpoints
app.post('/api/warehouses', (req, res) => {
  const { name, location } = req.body;
  db.run('INSERT INTO warehouses (name, location) VALUES (?, ?)', [name, location], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get('/api/warehouses', (req, res) => {
  db.all('SELECT * FROM warehouses', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/warehouses/:id/assign', (req, res) => {
  const warehouseId = req.params.id;
  const targetUserId = req.body.user_id;
  if (!targetUserId) return res.status(400).json({ error: 'Missing user_id' });
  db.run('INSERT OR IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [targetUserId, warehouseId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ assigned: true });
  });
});

app.get('/api/user/warehouses', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  db.all('SELECT w.* FROM warehouses w JOIN user_warehouses uw ON w.id = uw.warehouse_id WHERE uw.user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// RAG Chatbot endpoint
app.post('/api/rag', async (req, res) => {
  const { query } = req.body;
  db.all('SELECT * FROM products', async (err, products) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT * FROM transactions ORDER BY date DESC LIMIT 20', async (err2, transactions) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const context = `Products: ${JSON.stringify(products)}\nTransactions: ${JSON.stringify(transactions)}`;
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an inventory assistant. Use the provided context to answer.' },
            { role: 'user', content: query },
            { role: 'system', content: context }
          ]
        });
        return res.json({ result: response.choices[0].message.content });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  });
});

// Run migrations then seed on startup (non-fatal)
try {
  await migrateIfNeeded();
  await seed();
} catch (err) {
  console.error('Startup migration/seed error (continuing):', err);
}

app.listen(3001, () => {
  console.log('Inventory server running on port 3001');
});
