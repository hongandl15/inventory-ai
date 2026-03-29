import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./inventory.db');

function run(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err){
    if (err) return reject(err);
    resolve(this);
  }));
}

function all(sql, params=[]) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

export async function seed() {
  try {
    // Clear existing data
    await run('PRAGMA foreign_keys = OFF');
    await run('BEGIN TRANSACTION');
    const tables = ['user_warehouses','transactions','products','users','warehouses'];
    for (const t of tables) {
      await run(`DELETE FROM ${t}`);
      await run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
    }

    // Create warehouses
    const whs = [
      { name: 'Kho Hà Nội', location: 'Hà Nội' },
      { name: 'Kho TP.HCM', location: 'TP.HCM' },
      { name: 'Kho Đà Nẵng', location: 'Đà Nẵng' }
    ];
    const whIds = [];
    for (const w of whs) {
      const r = await run('INSERT INTO warehouses (name, location) VALUES (?, ?)', [w.name, w.location]);
      whIds.push(r.lastID);
    }

    // Create users
    // Passwords are hashed by the app on register, but seed uses plain text for demo users table (if bcrypt present in app it's fine)
    await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin','adminpass','admin')");
    await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('alice','alicepass','user')");
    await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('bob','bobpass','user')");

    const users = await all('SELECT id, username FROM users');
    const userMap = {};
    users.forEach(u => userMap[u.username] = u.id);

    // Assign users to warehouses
    await run('INSERT OR IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [userMap.alice, whIds[0]]);
    await run('INSERT OR IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [userMap.bob, whIds[1]]);

    // Create products across warehouses
    const products = [
      { name: 'Bút bi', sku: 'PEN-001', quantity: 120, warehouse_id: whIds[0] },
      { name: 'Sổ tay', sku: 'NBK-001', quantity: 80, warehouse_id: whIds[0] },
      { name: 'Túi xách', sku: 'BAG-001', quantity: 20, warehouse_id: whIds[1] },
      { name: 'Chuột máy tính', sku: 'MSE-001', quantity: 200, warehouse_id: whIds[2] },
      { name: 'Bàn phím', sku: 'KBD-001', quantity: 150, warehouse_id: whIds[1] },
      { name: 'Tai nghe', sku: 'HPH-001', quantity: 60, warehouse_id: whIds[2] }
    ];
    const prodIds = [];
    for (const p of products) {
      const r = await run('INSERT INTO products (name, sku, quantity, warehouse_id) VALUES (?, ?, ?, ?)', [p.name, p.sku, p.quantity, p.warehouse_id]);
      prodIds.push(r.lastID);
    }

    // Create transactions for history
    const now = new Date();
    const txs = [
      { product_id: prodIds[0], type: 'in', amount: 50, date: new Date(now.getTime() - 1000*60*60*24*10).toISOString(), warehouse_id: whIds[0] },
      { product_id: prodIds[0], type: 'out', amount: 10, date: new Date(now.getTime() - 1000*60*60*24*7).toISOString(), warehouse_id: whIds[0] },
      { product_id: prodIds[2], type: 'in', amount: 30, date: new Date(now.getTime() - 1000*60*60*24*5).toISOString(), warehouse_id: whIds[1] },
      { product_id: prodIds[3], type: 'out', amount: 20, date: new Date(now.getTime() - 1000*60*60*24*2).toISOString(), warehouse_id: whIds[2] },
      { product_id: prodIds[4], type: 'in', amount: 100, date: new Date(now.getTime() - 1000*60*60*24*3).toISOString(), warehouse_id: whIds[1] }
    ];
    for (const t of txs) {
      await run('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [t.product_id, t.type, t.amount, t.date, t.warehouse_id]);
    }

    await run('COMMIT');
    await run('PRAGMA foreign_keys = ON');
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    try { await run('ROLLBACK'); } catch(e){}
  }
}

