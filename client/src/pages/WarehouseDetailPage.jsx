import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { formatNumber, formatDate } from '../utils/format';

export default function WarehouseDetailPage(){
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({});

  useEffect(()=>{ load(); }, [id]);
  const load = () => {
    setLoading(true);
    axios.get(`${API_BASE}/api/warehouses/${id}/full`).then(res => setData(res.data)).catch(()=>setData(null)).finally(()=>setLoading(false));
  };

  const save = () => {
    axios.patch(`${API_BASE}/api/warehouses/${id}`, edit).then(()=>load());
  };

  if (loading) return <div className="card">Đang tải...</div>;
  if (!data) return <div className="card">Không tìm thấy kho.</div>;

  const { warehouse, products, transfers, users, rawRows } = data;
  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0 }}>{warehouse.name} <small style={{ color:'#666' }}>#{warehouse.id}</small></h2>
        <div>
          <button className="button" onClick={save}>Lưu</button>
          <button className="button" onClick={()=>nav('/warehouses')} style={{ marginLeft:8 }}>Đóng</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
        <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Thông tin kho</h4>
          <div><strong>Tên:</strong> <input value={edit.name ?? warehouse.name} onChange={e=>setEdit(s=>({...s, name: e.target.value}))} /></div>
          <div><strong>Vị trí:</strong> <input value={edit.location ?? warehouse.location} onChange={e=>setEdit(s=>({...s, location: e.target.value}))} /></div>
          <div style={{ marginTop:8 }}><strong>Người được gán:</strong>
            <ul>{users.map(u => <li key={u.id}>{u.username} ({u.id})</li>)}</ul>
          </div>
        </div>

        <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Số liệu nhanh</h4>
          <div><strong>Sản phẩm:</strong> {products.length}</div>
          <div><strong>Giao dịch:</strong> {transfers.length}</div>
          <div><strong>Dòng raw liên quan:</strong> {rawRows.length}</div>
        </div>
      </div>

      <div style={{ marginTop:16, display:'flex', gap:12 }}>
        <div style={{ flex:1, background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Sản phẩm trong kho</h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'#f3f7fb' }}><tr><th style={{ padding:8 }}>Tên</th><th style={{ padding:8 }}>SKU</th><th style={{ padding:8 }}>Số lượng</th><th style={{ padding:8 }}>Giá</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}><td style={{ padding:8 }}>{p.name}</td><td style={{ padding:8 }}>{p.sku}</td><td style={{ padding:8 }}>{formatNumber(p.quantity)}</td><td style={{ padding:8 }}>{p.price == null ? '—' : formatNumber(p.price)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex:1, background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Giao dịch gần đây</h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'#f3f7fb' }}><tr><th style={{ padding:8 }}>ID</th><th style={{ padding:8 }}>Tên sản phẩm</th><th style={{ padding:8 }}>Loại</th><th style={{ padding:8 }}>Số lượng</th><th style={{ padding:8 }}>Ngày</th></tr></thead>
            <tbody>
              {transfers.map(t => {
                const prodFrom = products.find(p => Number(p.id) === Number(t.product_id_from));
                const prodTo = products.find(p => Number(p.id) === Number(t.product_id_to));
                const prodName = prodFrom ? prodFrom.name : (prodTo ? prodTo.name : (t.product_name || '—'));
                return (
                  <tr key={t.id}>
                    <td style={{ padding:8 }}>{t.id}</td>
                    <td style={{ padding:8 }}>{prodName}</td>
                    <td style={{ padding:8 }}>{t.product_id_from ? 'Transfer' : t.type || '—'}</td>
                    <td style={{ padding:8 }}>{formatNumber(t.quantity)}</td>
                    <td style={{ padding:8 }}>{formatDate(t.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
