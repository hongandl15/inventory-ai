import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { seed } from './seed.js';
// AI: Natural language query (placeholder)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// import { Configuration, OpenAIApi } from 'openai'; // Uncomment when API key is set

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY
// });
// const openai = new OpenAIApi(configuration);

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
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id_from INTEGER,
  product_id_to INTEGER,
  quantity INTEGER,
  date TEXT,
  from_warehouse_id INTEGER,
  to_warehouse_id INTEGER
);
CREATE TABLE IF NOT EXISTS raw_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_name TEXT,
  country_name TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  warehouse_address TEXT,
  warehouse_name TEXT,
  employee_name TEXT,
  employee_email TEXT,
  employee_phone TEXT,
  employee_hire_date TEXT,
  employee_job_title TEXT,
  category_name TEXT,
  product_name TEXT,
  product_description TEXT,
  product_standard_cost TEXT,
  profit TEXT,
  product_list_price TEXT,
  customer_name TEXT,
  customer_address TEXT,
  customer_credit_limit TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT,
  order_date TEXT,
  order_item_quantity TEXT,
  per_unit_price TEXT,
  total_item_quantity TEXT
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
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
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
    if (!pnames.includes('price')) {
      console.log('Migrating: adding price to products');
      await runAsync('ALTER TABLE products ADD COLUMN price REAL');
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

// API: Paginated products (supports warehouse filter, search, sort)
app.get('/api/products/paginated', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.max(1, parseInt(req.query.perPage || '20', 10));
    const warehouse_id = req.query.warehouse_id;
    const q = req.query.q || '';
    const sortBy = req.query.sortBy || 'name';
    const sortDir = (req.query.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedSort = ['name','sku','quantity','price'];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : 'name';

    const params = [];
    const conds = [];
    if (warehouse_id) { conds.push('warehouse_id = ?'); params.push(warehouse_id); }
    if (q) { conds.push('(name LIKE ? OR sku LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';

    const countRow = await getAsync(`SELECT COUNT(*) as c FROM products ${where}`, params);
    const total = countRow ? countRow.c : 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const offset = (page - 1) * perPage;
    const sql = `SELECT * FROM products ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    const rows = await allAsync(sql, params.concat([perPage, offset]));
    res.json({ items: rows, total, page, perPage, totalPages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Add product
app.post('/api/products', (req, res) => {
  const { name, sku, quantity, warehouse_id, price } = req.body;
  db.run('INSERT INTO products (name, sku, quantity, warehouse_id, price) VALUES (?, ?, ?, ?, ?)', [name, sku, quantity, warehouse_id || null, price || null], function(err) {
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

// API: Get product full detail (product + transactions + sales + warehouse + related raw_data rows)
app.get('/api/products/:id/full', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Not found' });
    const transactions = await allAsync('SELECT * FROM transactions WHERE product_id = ? ORDER BY date DESC LIMIT 200', [id]);
    const sales = await allAsync('SELECT * FROM sales WHERE product_id = ? ORDER BY date DESC LIMIT 200', [id]);
    const warehouse = product.warehouse_id ? await getAsync('SELECT * FROM warehouses WHERE id = ?', [product.warehouse_id]) : null;
    // try to find related raw_data rows by product name or SKU
    const rawRows = await allAsync('SELECT * FROM raw_data WHERE product_name = ? OR product_description LIKE ? LIMIT 500', [product.name, `%${product.sku || ''}%`]);
    res.json({ product, transactions, sales, warehouse, rawRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Update product fields (name, sku, quantity, price, warehouse_id)
app.patch('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const allowed = ['name','sku','quantity','price','warehouse_id'];
    const fields = [];
    const params = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// API: return raw parsed data file (data.md / data.csv) as JSON rows
app.get('/api/rawdata', (req, res) => {
  try {
    const candidates = ['./data.md','./data.csv','../data.md','../data.csv','./data.txt','../data.txt'];
    let path = null;
    for (const c of candidates) if (fs.existsSync(c)) { path = c; break; }
    if (!path) return res.status(404).json({ error: 'No data file found' });
    const raw = fs.readFileSync(path, 'utf8').trim();
    if (!raw) return res.json([]);
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const first = lines.shift();
    const delimiter = first.includes('\t') ? '\t' : ',';
    const headers = first.split(delimiter).map(h => h.trim());
    const rows = lines.map(line => {
      const cols = line.split(delimiter).map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] !== undefined ? cols[i] : null; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: return rows saved in DB raw_data table
app.get('/api/rawdb', (req, res) => {
  db.all('SELECT * FROM raw_data ORDER BY id LIMIT 10000', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});



app.post('/api/ai/test', async (req, res) => {
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

// API: DS Lab summary endpoint - compute basic stats, histograms and top categories
app.get('/api/ds/summary', async (req, res) => {
  try {
    // products summary
    const products = await allAsync('SELECT id, name, sku, quantity, price, warehouse_id FROM products');
    const prodCount = products.length;
    const quantities = products.map(p => Number(p.quantity) || 0);
    const prices = products.map(p => (p.price !== null && p.price !== undefined) ? Number(p.price) : null).filter(v => v !== null);

    const sum = arr => arr.reduce((a,b)=>a+b,0);
    const stats = (arr) => ({
      count: arr.length,
      sum: sum(arr),
      mean: arr.length ? sum(arr)/arr.length : 0,
      min: arr.length ? Math.min(...arr) : 0,
      max: arr.length ? Math.max(...arr) : 0
    });

    const qtyStats = stats(quantities);
    const priceStats = stats(prices);

    // histogram buckets helper (simple fixed buckets)
    function histogram(arr, buckets = 6) {
      if (!arr.length) return { buckets: [], min:0, max:0 };
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const width = (max - min) / buckets || 1;
      const b = Array.from({length: buckets}, () => 0);
      for (const v of arr) {
        const idx = Math.min(buckets-1, Math.floor((v - min) / width));
        b[idx]++;
      }
      const ranges = b.map((c,i) => ({
        range: `${(min + i*width).toFixed(2)} - ${(min + (i+1)*width).toFixed(2)}`,
        count: c
      }));
      return { buckets: ranges, min, max };
    }

    const qtyHist = histogram(quantities, 6);
    const priceHist = histogram(prices, 6);

    // top categories from raw_data.category_name
    const cats = await allAsync('SELECT category_name, COUNT(*) as c FROM raw_data GROUP BY category_name ORDER BY c DESC LIMIT 10');

    // top warehouses by product count
    const whTop = await allAsync('SELECT w.id, w.name, COUNT(p.id) as c FROM warehouses w LEFT JOIN products p ON p.warehouse_id = w.id GROUP BY w.id ORDER BY c DESC LIMIT 10');

    res.json({
      products: { total: prodCount, qtyStats, priceStats, qtyHist, priceHist },
      topCategories: cats,
      topWarehouses: whTop
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// API: Get full warehouse detail (warehouse + products + transfers + assigned users + related raw rows)
app.get('/api/warehouses/:id/full', async (req, res) => {
  try {
    const id = req.params.id;
    const warehouse = await getAsync('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (!warehouse) return res.status(404).json({ error: 'Not found' });
    const products = await allAsync('SELECT * FROM products WHERE warehouse_id = ?', [id]);
    const transfers = await allAsync('SELECT * FROM transfers WHERE from_warehouse_id = ? OR to_warehouse_id = ? ORDER BY date DESC LIMIT 200', [id, id]);
    const users = await allAsync('SELECT u.* FROM users u JOIN user_warehouses uw ON u.id = uw.user_id WHERE uw.warehouse_id = ?', [id]);
    const rawRows = await allAsync('SELECT * FROM raw_data WHERE warehouse_name = ? OR warehouse_address = ? LIMIT 500', [warehouse.name, warehouse.location]);
    res.json({ warehouse, products, transfers, users, rawRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Update warehouse
app.patch('/api/warehouses/:id', (req, res) => {
  const id = req.params.id;
  const allowed = ['name','location'];
  const fields = [];
  const params = [];
  for (const k of allowed) {
    if (req.body[k] !== undefined) { fields.push(`${k} = ?`); params.push(req.body[k]); }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);
  const sql = `UPDATE warehouses SET ${fields.join(', ')} WHERE id = ?`;
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// API: List transfers
app.get('/api/transfers', async (req, res) => {
  try {
    const rows = await allAsync('SELECT t.*, pfrom.name as product_from_name, pto.name as product_to_name, wf.name as from_warehouse_name, wt.name as to_warehouse_name FROM transfers t LEFT JOIN products pfrom ON pfrom.id = t.product_id_from LEFT JOIN products pto ON pto.id = t.product_id_to LEFT JOIN warehouses wf ON wf.id = t.from_warehouse_id LEFT JOIN warehouses wt ON wt.id = t.to_warehouse_id ORDER BY t.date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// API: Transfer stock between warehouses
app.post('/api/transfers', async (req, res) => {
  const { product_id, to_warehouse_id, quantity } = req.body;
  if (!product_id || !to_warehouse_id || !quantity) return res.status(400).json({ error: 'Missing fields' });
  try {
    const src = await getAsync('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!src) return res.status(404).json({ error: 'Source product not found' });
    if ((src.quantity || 0) < Number(quantity)) return res.status(400).json({ error: 'Insufficient quantity in source' });
    const fromWid = src.warehouse_id;
    const date = new Date().toISOString();

    // Deduct from source product
    await runAsync('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, product_id]);

    // Find destination product (same SKU) in target warehouse
    let dest = await getAsync('SELECT * FROM products WHERE sku = ? AND warehouse_id = ?', [src.sku, to_warehouse_id]);
    let destProductId;
    if (dest) {
      await runAsync('UPDATE products SET quantity = quantity + ? WHERE id = ?', [quantity, dest.id]);
      destProductId = dest.id;
    } else {
      const ins = await runAsync('INSERT INTO products (name, sku, quantity, warehouse_id) VALUES (?, ?, ?, ?)', [src.name, src.sku, quantity, to_warehouse_id]);
      destProductId = ins.lastID;
    }

    // Record transactions for audit
    await runAsync('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [product_id, 'out', quantity, date, fromWid]);
    await runAsync('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [destProductId, 'in', quantity, date, to_warehouse_id]);

    // Record transfer
    const t = await runAsync('INSERT INTO transfers (product_id_from, product_id_to, quantity, date, from_warehouse_id, to_warehouse_id) VALUES (?, ?, ?, ?, ?, ?)', [product_id, destProductId, quantity, date, fromWid, to_warehouse_id]);

    res.json({ transferred: true, transfer_id: t.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// RAG Chatbot endpoint — gather DB context and answer with OpenAI
app.post('/api/ai', async (req, res) => {
  const { query } = req.body || {};
  try {
    // gather relevant data from DB
    const products = await allAsync('SELECT id, name, sku, quantity, price, warehouse_id FROM products');
    const transactions = await allAsync('SELECT id, product_id, type, amount, date, warehouse_id FROM transactions ORDER BY date DESC');
    const sales = await allAsync('SELECT id, product_id, quantity, unit_price, total, date, warehouse_id FROM sales ORDER BY date DESC');
    const warehouses = await allAsync('SELECT id, name, location FROM warehouses');

    // build lightweight summaries to keep prompt size reasonable
    // Build context with all columns for each record (limit to avoid context overflow)
    function formatRow(row) {
      return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }

    const contextParts = [];
    const LIMIT = 1000;
    contextParts.push(`Warehouses (${warehouses.length}):\n${warehouses.slice(0,LIMIT).map(formatRow).join('\n')}`);
    if (warehouses.length > LIMIT) contextParts.push(`...and ${warehouses.length - LIMIT} more warehouses`);
    contextParts.push(`Products (${products.length}):\n${products.slice(0,LIMIT).map(formatRow).join('\n')}`);
    if (products.length > LIMIT) contextParts.push(`...and ${products.length - LIMIT} more products`);
    contextParts.push(`Transactions (${transactions.length}):\n${transactions.slice(0,LIMIT).map(formatRow).join('\n')}`);
    if (transactions.length > LIMIT) contextParts.push(`...and ${transactions.length - LIMIT} more transactions`);
    contextParts.push(`Sales (${sales.length}):\n${sales.slice(0,LIMIT).map(formatRow).join('\n')}`);
    if (sales.length > LIMIT) contextParts.push(`...and ${sales.length - LIMIT} more sales`);

    const context = contextParts.join('\n\n');

    // Query the model with the assembled context and request nicely formatted text in Vietnamese
    const systemPrompt = `Bạn là trợ lý quản lý kho. Sử dụng thông tin trong phần Context để trả lời chính xác câu hỏi của người dùng và trích dẫn tên/ID khi cần. Nếu câu trả lời cần số liệu hiện tại, hãy ưu tiên dữ liệu đã cung cấp. Chỉ sử dụng duy nhất tiếng Việt trong toàn bộ phản hồi (không dùng ngôn ngữ khác). Viết câu ngắn gọn, xuống dòng giữa các đoạn, và dùng danh sách gạch đầu dòng khi hữu ích. KHÔNG trả về JSON — chỉ trả về văn bản thuần.`;
    const userPrompt = `Câu hỏi của người dùng: ${query}\n\nContext:\n${context}\n\nVui lòng đưa ra một tóm tắt ngắn (1-2 câu) trước, sau đó nêu các chi tiết liên quan hoặc các bước thực hiện, định dạng có xuống dòng và các gạch đầu dòng nếu cần. Trả lời hoàn toàn bằng tiếng Việt.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini-2026-03-17',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 20000
    });

    const answer = response?.choices?.[0]?.message?.content || '';
    res.json({ result: answer });
  } catch (err) {
    console.error('RAG error:', err?.message || err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// (Removed notebook image static serving)

// API: Export CSV for products or raw_data
app.get('/api/ds/export', async (req, res) => {
  try {
    const type = req.query.type === 'raw' ? 'raw' : 'products';
    let rows = [];
    if (type === 'raw') {
      rows = await allAsync('SELECT * FROM raw_data');
    } else {
      rows = await allAsync('SELECT * FROM products');
    }
    if (!rows || !rows.length) return res.status(200).send('');
    const keys = Object.keys(rows[0]);
    const csvLines = [keys.join(',')];
    for (const r of rows) {
      const line = keys.map(k => {
        const v = r[k] === null || r[k] === undefined ? '' : String(r[k]).replace(/"/g,'""');
        return `"${v}"`;
      }).join(',');
      csvLines.push(line);
    }
    const filename = `ds_export_${type}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Pearson correlation
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const ma = a.reduce((s,x)=>s+x,0)/a.length;
  const mb = b.reduce((s,x)=>s+x,0)/b.length;
  const num = a.reduce((s,x,i)=>s + ((x - ma) * (b[i] - mb)), 0);
  const sa = Math.sqrt(a.reduce((s,x)=>s + Math.pow(x - ma,2),0));
  const sb = Math.sqrt(b.reduce((s,x,i)=>s + Math.pow(b[i] - mb,2),0));
  const denom = sa * sb;
  if (!denom) return 0;
  return num / denom;
}

// API: Correlation matrix computed from numeric fields in raw_data and products
app.get('/api/ds/correlation', async (req, res) => {
  try {
    // gather numeric columns from products
    const prows = await allAsync('SELECT id, quantity, price FROM products');
    const prodNums = {
      quantity: prows.map(p => Number(p.quantity) || 0),
      price: prows.map(p => (p.price !== null && p.price !== undefined) ? Number(p.price) : NaN)
    };

    // gather numeric columns from raw_data (attempt parsing common fields)
    const rrows = await allAsync('SELECT product_standard_cost, profit, product_list_price, order_item_quantity, per_unit_price, total_item_quantity FROM raw_data');
    const rawFields = ['product_standard_cost','profit','product_list_price','order_item_quantity','per_unit_price','total_item_quantity'];
    const rawNums = {};
    for (const f of rawFields) rawNums[f] = rrows.map(r => {
      const v = r && r[f] !== undefined && r[f] !== null ? String(r[f]).replace(/[^0-9.+-eE]/g,'') : '';
      const n = v === '' ? NaN : Number(v);
      return isFinite(n) ? n : NaN;
    });

    // Build combined columns (only include columns with at least one finite number)
    const cols = [];
    const dataMap = {};
    for (const k of Object.keys(prodNums)) {
      const arr = prodNums[k].filter(v => !Number.isNaN(v));
      if (arr.length) { cols.push(k); dataMap[k] = prodNums[k]; }
    }
    for (const k of Object.keys(rawNums)) {
      const arr = rawNums[k].filter(v => !Number.isNaN(v));
      if (arr.length) { cols.push(k); dataMap[k] = rawNums[k]; }
    }

    // compute matrix
    const matrix = cols.map(c1 => cols.map(c2 => {
      const a = dataMap[c1].map(v => Number.isFinite(v) ? v : 0);
      const b = dataMap[c2].map(v => Number.isFinite(v) ? v : 0);
      return Number(pearson(a,b).toFixed(4));
    }));

    res.json({ columns: cols, matrix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (Removed notebook-images endpoint)

// (Removed notebook parsing endpoint)

// API: Simple prediction endpoint (univariate linear regression)
app.get('/api/ds/predict', async (req, res) => {
  try {
    // use raw_data product_list_price -> profit by default
    const rows = await allAsync('SELECT id, product_name, product_list_price, profit FROM raw_data');
    const data = rows.map(r => {
      const xRaw = r.product_list_price || r.per_unit_price || '';
      const x = Number(String(xRaw).replace(/[^0-9.+-eE]/g,''));
      const y = Number(String(r.profit||'').replace(/[^0-9.+-eE]/g,''));
      return { id: r.id, name: r.product_name || '', x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
    });

    const pairs = data.filter(d => !Number.isNaN(d.x) && !Number.isNaN(d.y));
    if (pairs.length < 3) return res.status(400).json({ error: 'Not enough numeric rows to build model' });

    const xs = pairs.map(p=>p.x);
    const ys = pairs.map(p=>p.y);
    const mean = arr => arr.reduce((s,v)=>s+v,0)/arr.length;
    const mx = mean(xs), my = mean(ys);
    let cov = 0, varx = 0;
    for (let i=0;i<xs.length;i++){ cov += (xs[i]-mx)*(ys[i]-my); varx += Math.pow(xs[i]-mx,2); }
    const beta = varx ? cov/varx : 0;
    const alpha = my - beta*mx;

    const predictions = data.map(d => ({ id: d.id, name: d.name, x: d.x, y: d.y, predicted: Number((alpha + beta*(Number.isFinite(d.x)?d.x:mx)).toFixed(4)) }));

    res.json({ model: { intercept: Number(alpha.toFixed(6)), slope: Number(beta.toFixed(6)), trained_on: pairs.length }, predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
