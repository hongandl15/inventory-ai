import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function WarehousePage(){
  const [warehouses, setWarehouses] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  useEffect(()=>{
    fetchWarehouses();
  },[]);

  const fetchWarehouses = ()=>{
    axios.get(`${API_BASE}/api/warehouses`).then(res => setWarehouses(res.data));
  };

  const create = ()=>{
    if(!name) return alert('Nhập tên kho');
    axios.post(`${API_BASE}/api/warehouses`, { name, location }).then(()=>{ setName(''); setLocation(''); fetchWarehouses(); });
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
    </div>
  );
}
