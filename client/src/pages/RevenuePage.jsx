import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function RevenuePage(){
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, sales_count: 0 });

  useEffect(() => {
    axios.get(`${API_BASE}/api/products`).then(res => setProducts(res.data)).catch(()=>{});
    axios.get(`${API_BASE}/api/warehouses`).then(res => setWarehouses(res.data)).catch(()=>{});
    loadSales();
  }, []);

  const loadSales = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (warehouse) params.warehouse_id = warehouse;
    const qs = new URLSearchParams(params).toString();
    axios.get(`${API_BASE}/api/sales${qs?('?'+qs):''}`).then(res => setSales(res.data)).catch(()=>{});
    axios.get(`${API_BASE}/api/revenue/summary${qs?('?'+qs):''}`).then(res => setSummary(res.data)).catch(()=>{});
  };

  const recordSale = () => {
    if (!productId) return alert('Chọn sản phẩm');
    axios.post(`${API_BASE}/api/sales`, { product_id: productId, quantity, unit_price: unitPrice }).then(res => {
      loadSales();
      setProductId(''); setQuantity(1); setUnitPrice(0);
      alert('Ghi nhận bán hàng: tổng ' + (res.data.total || 0));
    }).catch(err => alert('Lỗi: ' + (err?.response?.data?.error || err.message)));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4' }}>Quản lý doanh thu</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={productId} onChange={e => setProductId(e.target.value)} style={{ flex: 2, padding: 10 }}>
          <option value="">Chọn sản phẩm</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
        <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={{ width: 120, padding: 10 }} />
        <input type="number" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} style={{ width: 140, padding: 10 }} placeholder="Giá bán" />
        <button onClick={recordSale} style={{ background: '#28a745', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: 6 }}>Ghi bán</button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <select value={warehouse} onChange={e => setWarehouse(e.target.value)}>
          <option value="">Tất cả kho</option>
          {warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={loadSales} style={{ padding: '8px 12px', borderRadius: 6, background: '#0078d4', color: '#fff' }}>Lọc</button>
        <div style={{ marginLeft: 'auto', fontWeight: 700 }}>Tổng doanh thu: {summary.revenue || 0} (Số giao dịch: {summary.sales_count || 0})</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f1f5f9' }}>
          <tr>
            <th style={{ padding: 10 }}>Ngày</th>
            <th style={{ padding: 10 }}>Sản phẩm</th>
            <th style={{ padding: 10 }}>Số lượng</th>
            <th style={{ padding: 10 }}>Giá</th>
            <th style={{ padding: 10 }}>Tổng</th>
            <th style={{ padding: 10 }}>Kho</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{new Date(s.date).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{s.product_name} ({s.product_sku})</td>
              <td style={{ padding: 8 }}>{s.quantity}</td>
              <td style={{ padding: 8 }}>{s.unit_price}</td>
              <td style={{ padding: 8 }}>{s.total}</td>
              <td style={{ padding: 8 }}>{s.warehouse_name || s.warehouse_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
