import sqlite3 from 'sqlite3';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const db = new sqlite3.Database('./inventory.db');

function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  }));
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

export async function seed() {
  try {
    // Ensure `price` column exists on products (safe to run repeatedly)
    try {
      const pcols = await all("PRAGMA table_info(products)");
      const pnames = pcols.map(c => c.name);
      if (!pnames.includes('price')) {
        await run('ALTER TABLE products ADD COLUMN price REAL');
      }
    } catch (e) {
      // ignore if table doesn't exist yet
    }

    // Clear existing data
    await run('PRAGMA foreign_keys = OFF');
    await run('BEGIN TRANSACTION');
    const tables = ['user_warehouses', 'transactions', 'products', 'users', 'warehouses'];
    for (const t of tables) {
      await run(`DELETE FROM ${t}`);
      await run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
    }

    // If a data file exists at project root (data.md / CSV/TSV), use it to seed
    // const candidates = ['./data.md','./data.csv','../data.md','../data.csv','./data.txt'];
    const candidates = ['./data.csv', '../data.csv'];
    let dataPath = null;
    for (const c of candidates) if (fs.existsSync(c)) { dataPath = c; break; }
    const whIds = [];
    const prodIds = [];
    const userMap = {};
    const productMap = new Map();
    const warehouseMap = new Map();

    // if (fs.existsSync(dataPath)) {
    //   const raw = fs.readFileSync(dataPath, 'utf8').trim();
    //   if (raw) {
    //     const lines = raw.split(/\r?\n/).filter(Boolean);
    //     const first = lines.shift();
    //     const delimiter = first.includes('\t') ? '\t' : ',';
    //     const headers = first.split(delimiter).map(h => h.trim());
    //     const idx = (name) => headers.indexOf(name);

    //     for (const line of lines) {
    //       const cols = line.split(delimiter).map(c => c.trim());
    //       // insert into raw_data table with best-effort mapping
    //       try {
    //         const map = (name) => {
    //           const i = headers.indexOf(name);
    //           return i >= 0 ? (cols[i] !== undefined ? cols[i] : null) : null;
    //         };
    //         await run(`INSERT INTO raw_data (region_name,country_name,state,city,postal_code,warehouse_address,warehouse_name,employee_name,employee_email,employee_phone,employee_hire_date,employee_job_title,category_name,product_name,product_description,product_standard_cost,profit,product_list_price,customer_name,customer_address,customer_credit_limit,customer_email,customer_phone,status,order_date,order_item_quantity,per_unit_price,total_item_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    //           map('RegionName'), map('CountryName'), map('State'), map('City'), map('PostalCode'), map('WarehouseAddress'), map('WarehouseName'), map('EmployeeName'), map('EmployeeEmail'), map('EmployeePhone'), map('EmployeeHireDate'), map('EmployeeJobTitle'), map('CategoryName'), map('ProductName'), map('ProductDescription'), map('ProductStandardCost'), map('Profit'), map('ProductListPrice'), map('CustomerName'), map('CustomerAddress'), map('CustomerCreditLimit'), map('CustomerEmail'), map('CustomerPhone'), map('Status'), map('OrderDate'), map('OrderItemQuantity'), map('PerUnitPrice'), map('TotalItemQuantity')
    //         ]).catch(()=>{});
    //       } catch(e) {
    //         // non-fatal
    //       }
    //       const warehouseName = cols[idx('WarehouseName')] || cols[idx('Warehouse')] || 'Default Warehouse';
    //       const warehouseAddress = cols[idx('WarehouseAddress')] || '';
    //       const employeeEmail = cols[idx('EmployeeEmail')] || cols[idx('Employee')];
    //       const employeeName = cols[idx('EmployeeName')] || employeeEmail || 'user';
    //       const productName = cols[idx('ProductName')] || cols[idx('Product')];
    //       const productQtyRaw = cols[idx('TotalItemQuantity')] || cols[idx('OrderItemQuantity')] || '0';
    //       const orderQtyRaw = cols[idx('OrderItemQuantity')] || '0';
    //       const orderDate = cols[idx('OrderDate')] || new Date().toISOString();

    //       // ensure warehouse
    //       if (!warehouseMap.has(warehouseName)) {
    //         const r = await run('INSERT INTO warehouses (name, location) VALUES (?, ?)', [warehouseName, warehouseAddress || '']);
    //         warehouseMap.set(warehouseName, r.lastID);
    //         whIds.push(r.lastID);
    //       }
    //       const wid = warehouseMap.get(warehouseName);

    //       // ensure user
    //       if (employeeEmail && !userMap[employeeEmail]) {
    //         await run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', [employeeEmail, 'password', 'user']);
    //         const u = await all('SELECT id, username FROM users WHERE username = ?', [employeeEmail]);
    //         if (u && u[0]) userMap[employeeEmail] = u[0].id;
    //       }

    //       // ensure product
    //       const productKey = `${productName}::${wid}`;
    //       if (productName && !productMap.has(productKey)) {
    //         const qty = parseInt(productQtyRaw.replace(/[^0-9.-]/g, '')) || parseInt(orderQtyRaw.replace(/[^0-9.-]/g, '')) || 0;
    //         const sku = (cols[idx('SKU')] || '').trim() || productName.slice(0,20).replace(/\s+/g,'-');
    //         const priceRaw = (cols[idx('ProductListPrice')] || cols[idx('PerUnitPrice')] || '').trim();
    //         const price = (priceRaw && priceRaw !== '') ? (parseFloat(priceRaw.replace(/[^0-9.-]/g,'')) || null) : null;
    //         const r = await run('INSERT INTO products (name, sku, quantity, warehouse_id, price) VALUES (?, ?, ?, ?, ?)', [productName, sku, qty, wid, price]);
    //         productMap.set(productKey, r.lastID);
    //         prodIds.push(r.lastID);
    //       }

    //       // insert a transaction record for the order (if product exists)
    //       if (productName) {
    //         const pid = productMap.get(productKey);
    //         const amt = parseInt(orderQtyRaw.replace(/[^0-9.-]/g, '')) || 0;
    //         const dateIso = (() => {
    //           try { return new Date(orderDate).toISOString(); } catch(e){ return new Date().toISOString(); }
    //         })();
    //         await run('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [pid, 'in', amt, dateIso, wid]);
    //       }
    //     }
    //   }
    // } 

    // const fs = require('fs');


    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf8').trim();

      if (raw) {
        const delimiter = raw.includes('\t') ? '\t' : ',';

        const records = parse(raw, {
          columns: true,
          skip_empty_lines: true,
          delimiter,
          relax_quotes: true,
          trim: true
        });

        const normalizeValue = (value) => {
          if (value === undefined || value === null) return null;

          const cleaned = String(value).trim();

          if (
            cleaned === '' ||
            cleaned.toLowerCase() === 'null' ||
            cleaned.toLowerCase() === 'undefined' ||
            cleaned.toLowerCase() === 'nan'
          ) {
            return null;
          }

          return cleaned;
        };

        const map = (row, name) => normalizeValue(row[name]);

        const mapFallback = (row, ...names) => {
          for (const name of names) {
            const value = map(row, name);
            if (value !== null) return value;
          }
          return null;
        };

        const parseNumber = (value, fallback = 0) => {
          if (!value) return fallback;
          const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
          return Number.isNaN(num) ? fallback : num;
        };

        for (const row of records) {
          try {
            await run(
              `INSERT INTO raw_data (
            region_name,country_name,state,city,postal_code,
            warehouse_address,warehouse_name,employee_name,
            employee_email,employee_phone,employee_hire_date,
            employee_job_title,category_name,product_name,
            product_description,product_standard_cost,profit,
            product_list_price,customer_name,customer_address,
            customer_credit_limit,customer_email,customer_phone,
            status,order_date,order_item_quantity,per_unit_price,
            total_item_quantity
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                map(row, 'RegionName'),
                map(row, 'CountryName'),
                map(row, 'State'),
                map(row, 'City'),
                map(row, 'PostalCode'),
                map(row, 'WarehouseAddress'),
                mapFallback(row, 'WarehouseName', 'Warehouse'),
                mapFallback(row, 'EmployeeName', 'Employee'),
                mapFallback(row, 'EmployeeEmail', 'Employee'),
                map(row, 'EmployeePhone'),
                map(row, 'EmployeeHireDate'),
                map(row, 'EmployeeJobTitle'),
                map(row, 'CategoryName'),
                mapFallback(row, 'ProductName', 'Product'),
                map(row, 'ProductDescription'),
                map(row, 'ProductStandardCost'),
                map(row, 'Profit'),
                mapFallback(row, 'ProductListPrice', 'PerUnitPrice'),
                map(row, 'CustomerName'),
                map(row, 'CustomerAddress'),
                map(row, 'CustomerCreditLimit'),
                map(row, 'CustomerEmail'),
                map(row, 'CustomerPhone'),
                map(row, 'Status'),
                map(row, 'OrderDate'),
                map(row, 'OrderItemQuantity'),
                mapFallback(row, 'PerUnitPrice', 'ProductListPrice'),
                mapFallback(row, 'TotalItemQuantity', 'OrderItemQuantity')
              ]
            );

            const warehouseName =
              mapFallback(row, 'WarehouseName', 'Warehouse') || 'Default Warehouse';

            const warehouseAddress = map(row, 'WarehouseAddress') || '';

            if (!warehouseMap.has(warehouseName)) {
              const result = await run(
                'INSERT INTO warehouses (name, location) VALUES (?, ?)',
                [warehouseName, warehouseAddress]
              );
              warehouseMap.set(warehouseName, result.lastID);
            }

            const wid = warehouseMap.get(warehouseName);

            const productName = mapFallback(row, 'ProductName', 'Product');

            if (productName) {
              const productKey = `${productName}::${wid}`;

              if (!productMap.has(productKey)) {
                const qty = parseInt(
                  parseNumber(
                    mapFallback(row, 'TotalItemQuantity', 'OrderItemQuantity'),
                    0
                  )
                );

                const price = parseNumber(
                  mapFallback(row, 'ProductListPrice', 'PerUnitPrice'),
                  null
                );

                const sku =
                  map(row, 'SKU') ||
                  productName.slice(0, 20).replace(/\s+/g, '-');

                const result = await run(
                  'INSERT INTO products (name, sku, quantity, warehouse_id, price) VALUES (?, ?, ?, ?, ?)',
                  [productName, sku, qty, wid, price]
                );

                productMap.set(productKey, result.lastID);
              }
            }
          } catch (err) {
            console.error('Import failed:', err.message);
          }
        }
      }
    }
    // else {
    //   // fallback: original demo seed (kept minimal)
    //   const whs = [
    //     { name: 'Kho Hà Nội', location: 'Hà Nội' },
    //     { name: 'Kho TP.HCM', location: 'TP.HCM' },
    //     { name: 'Kho Đà Nẵng', location: 'Đà Nẵng' }
    //   ];
    //   for (const w of whs) {
    //     const r = await run('INSERT INTO warehouses (name, location) VALUES (?, ?)', [w.name, w.location]);
    //     whIds.push(r.lastID);
    //   }

    //   await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin','adminpass','admin')");
    //   await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('alice','alicepass','user')");
    //   await run("INSERT OR IGNORE INTO users (username, password, role) VALUES ('bob','bobpass','user')");

    //   const users = await all('SELECT id, username FROM users');
    //   users.forEach(u => userMap[u.username] = u.id);

    //   await run('INSERT OR IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [userMap.alice, whIds[0]]).catch(()=>{});
    //   await run('INSERT OR IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [userMap.bob, whIds[1]]).catch(()=>{});

    //   const products = [
    //     { name: 'Bút bi', sku: 'PEN-001', quantity: 120, warehouse_id: whIds[0] },
    //     { name: 'Sổ tay', sku: 'NBK-001', quantity: 80, warehouse_id: whIds[0] },
    //     { name: 'Túi xách', sku: 'BAG-001', quantity: 20, warehouse_id: whIds[1] }
    //   ];
    //   for (const p of products) {
    //     const r = await run('INSERT INTO products (name, sku, quantity, warehouse_id) VALUES (?, ?, ?, ?)', [p.name, p.sku, p.quantity, p.warehouse_id]);
    //     prodIds.push(r.lastID);
    //   }

    //   const now = new Date();
    //   const txs = [
    //     { product_id: prodIds[0], type: 'in', amount: 50, date: new Date(now.getTime() - 1000*60*60*24*10).toISOString(), warehouse_id: whIds[0] }
    //   ];
    //   for (const t of txs) {
    //     await run('INSERT INTO transactions (product_id, type, amount, date, warehouse_id) VALUES (?, ?, ?, ?, ?)', [t.product_id, t.type, t.amount, t.date, t.warehouse_id]);
    //   }
    // }

    await run('COMMIT');
    await run('PRAGMA foreign_keys = ON');
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    try { await run('ROLLBACK'); } catch (e) { }
  }
}

