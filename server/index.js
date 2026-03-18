import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
// import { Configuration, OpenAIApi } from 'openai'; // Uncomment when API key is set


const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./inventory.db');

// Create tables if not exist
const initSQL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sku TEXT,
  quantity INTEGER
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  type TEXT,
  amount INTEGER,
  date TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
`;
db.exec(initSQL);

// API: Get all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add product
app.post('/api/products', (req, res) => {
  const { name, sku, quantity } = req.body;
  db.run('INSERT INTO products (name, sku, quantity) VALUES (?, ?, ?)', [name, sku, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// API: Update product quantity
app.put('/api/products/:id', (req, res) => {
  const { quantity } = req.body;
  db.run('UPDATE products SET quantity = ? WHERE id = ?', [quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
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
  db.run('INSERT INTO transactions (product_id, type, amount, date) VALUES (?, ?, ?, ?)', [product_id, type, amount, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // Update product quantity
    db.run('UPDATE products SET quantity = quantity + ? WHERE id = ?', [type === 'in' ? amount : -amount, product_id]);
    res.json({ id: this.lastID });
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

// API: Basic user management (register/login, no password hash for demo)
db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, role TEXT)');
app.post('/api/users/register', (req, res) => {
  const { username, password, role } = req.body;
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role || 'user'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});
app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ id: row.id, username: row.username, role: row.role });
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

app.listen(3001, () => {
  console.log('Inventory server running on port 3001');
});
