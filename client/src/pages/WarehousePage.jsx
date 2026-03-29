import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function WarehousePage(){
  const [warehouses, setWarehouses] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [transferQty, setTransferQty] = useState(0);

  useEffect(()=>{
    fetchWarehouses();
    fetchProducts();
    fetchTransfers();
  },[]);

  const fetchWarehouses = ()=>{
    axios.get(`${API_BASE}/api/warehouses`).then(res => setWarehouses(res.data));
  };

  const fetchProducts = ()=>{
    axios.get(`${API_BASE}/api/products`).then(res => setProducts(res.data));
  };

  const fetchTransfers = ()=>{
    axios.get(`${API_BASE}/api/transfers`).then(res => setTransfers(res.data));
  };

  const create = ()=>{
    if(!name) return alert('Nhập tên kho');
    axios.post(`${API_BASE}/api/warehouses`, { name, location }).then(()=>{ setName(''); setLocation(''); fetchWarehouses(); });
  };

  const doTransfer = ()=>{
    if(!selectedProduct) return alert('Chọn sản phẩm nguồn');
    if(!toWarehouse) return alert('Chọn kho đích');
    if(!transferQty || Number(transferQty) <= 0) return alert('Số lượng phải lớn hơn 0');
    axios.post(`${API_BASE}/api/transfers`, { product_id: selectedProduct, to_warehouse_id: toWarehouse, quantity: Number(transferQty) })
      .then(res => {
        alert('Chuyển kho thành công');
        setSelectedProduct(''); setToWarehouse(''); setTransferQty(0);
        fetchProducts(); fetchWarehouses(); fetchTransfers();
      }).catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Lỗi';
        alert('Chuyển kho thất bại: ' + msg);
      });
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 32, marginBottom: 32, boxShadow: '0 4px 24px #0002' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 24 }}>Quản lý kho hàng</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <input placeholder="Tên kho" value={name} onChange={e=>setName(e.target.value)} style={{ padding:10, borderRadius:6, border:'1px solid #b0b8c1' }} />
        <input placeholder="Vị trí" value={location} onChange={e=>setLocation(e.target.value)} style={{ padding:10, borderRadius:6, border:'1px solid #b0b8c1' }} />
        <button onClick={create} style={{ background:'#0078d4', color:'#fff', border:'none', borderRadius:6, padding:'10px 20px' }}>Tạo kho</button>
      </div>
      <table style={{ width:'100%', background:'#fff', borderRadius:8, overflow:'hidden' }}>
        <thead style={{ background:'#eaf1fb' }}><tr><th style={{ padding:12 }}>ID</th><th style={{ padding:12 }}>Tên</th><th style={{ padding:12 }}>Vị trí</th></tr></thead>
        <tbody>
          {warehouses.map(w=> (
            <tr key={w.id} style={{ borderBottom:'1px solid #eee' }}><td style={{ padding:10 }}>{w.id}</td><td style={{ padding:10 }}>{w.name}</td><td style={{ padding:10 }}>{w.location}</td></tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ marginTop:24, background:'#fff', padding:16, borderRadius:8 }}>
        <h3 style={{ marginTop:0 }}>Chuyển hàng giữa kho</h3>
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label>Chọn sản phẩm (nguồn)</label>
            <select value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} style={{ width:'100%', padding:8, borderRadius:6 }}>
              <option value="">-- Chọn sản phẩm --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (SKU:{p.sku}) — kho:{p.warehouse_id || '—'} — tồn:{p.quantity}</option>
              ))}
            </select>
          </div>

          <div style={{ width:180 }}>
            <label>Kho đích</label>
            <select value={toWarehouse} onChange={e=>setToWarehouse(e.target.value)} style={{ width:'100%', padding:8, borderRadius:6 }}>
              <option value="">-- Chọn kho đích --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div style={{ width:140 }}>
            <label>Số lượng</label>
            <input type="number" value={transferQty} onChange={e=>setTransferQty(e.target.value)} style={{ width:'100%', padding:8, borderRadius:6 }} />
          </div>

          <div>
            <button onClick={doTransfer} style={{ background:'#0078d4', color:'#fff', border:'none', padding:'10px 14px', borderRadius:6 }}>Chuyển</button>
          </div>
        </div>

        <h4 style={{ marginBottom:8 }}>Lịch sử chuyển kho (mới nhất)</h4>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead style={{ background:'#f3f7fb' }}><tr><th style={{ padding:8 }}>ID</th><th style={{ padding:8 }}>Sản phẩm (từ → đến)</th><th style={{ padding:8 }}>Số lượng</th><th style={{ padding:8 }}>Ngày</th></tr></thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id} style={{ borderBottom:'1px solid #eee' }}>
                <td style={{ padding:8 }}>{t.id}</td>
                <td style={{ padding:8 }}>{t.product_from_name || t.product_id_from} → {t.product_to_name || t.product_id_to} <div style={{ color:'#666', fontSize:12 }}>{t.from_warehouse_name || t.from_warehouse_id} → {t.to_warehouse_name || t.to_warehouse_id}</div></td>
                <td style={{ padding:8 }}>{t.quantity}</td>
                <td style={{ padding:8 }}>{new Date(t.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
