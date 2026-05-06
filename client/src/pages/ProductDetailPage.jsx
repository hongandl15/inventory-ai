import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { formatNumber, formatCurrency, formatDate } from '../utils/format';

export default function ProductDetailPage(){
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({});

  useEffect(()=>{ load(); }, [id]);
  const load = () => {
    setLoading(true);
    axios.get(`${API_BASE}/api/products/${id}/full`).then(res => setData(res.data)).catch(()=>setData(null)).finally(()=>setLoading(false));
  };

  const save = () => {
    const payload = {};
    ['name','sku','quantity','price','warehouse_id'].forEach(k => { if (edit[k] !== undefined) payload[k] = edit[k]; });
    axios.patch(`${API_BASE}/api/products/${id}`, payload).then(()=>load());
  };

  const remove = () => {
    if (!confirm('Xóa sản phẩm này?')) return;
    axios.delete(`${API_BASE}/api/products/${id}`).then(()=>{ nav('/'); });
  };

  if (loading) return <div className="card">Đang tải...</div>;
  if (!data) return <div className="card">Không tìm thấy sản phẩm.</div>;

  const { product, transactions, sales, warehouse, rawRows } = data;
  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0 }}>{product.name} <small style={{ color:'#666' }}>#{product.id}</small></h2>
        <div>
          <button className="button" onClick={save}>Lưu</button>
          <button className="button" onClick={remove} style={{ marginLeft:8, background:'#dc3545', color:'#fff' }}>Xóa</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
        <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Thông tin</h4>
          <div><strong>Tên:</strong> <input value={edit.name ?? product.name} onChange={e=>setEdit(s=>({...s, name: e.target.value}))} /></div>
          <div><strong>SKU:</strong> <input value={edit.sku ?? (product.sku||'')} onChange={e=>setEdit(s=>({...s, sku: e.target.value}))} /></div>
          <div><strong>Số lượng:</strong> <input type="number" value={edit.quantity ?? (product.quantity||0)} onChange={e=>setEdit(s=>({...s, quantity: Number(e.target.value)}))} /></div>
          <div><strong>Giá bán:</strong> <input value={edit.price ?? (product.price==null ? '' : product.price)} onChange={e=>setEdit(s=>({...s, price: e.target.value === '' ? null : Number(e.target.value)}))} /></div>
          <div><strong>Kho:</strong> {warehouse ? `${warehouse.name} (${warehouse.id})` : '—'}</div>
        </div>

        <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Khóa liên quan</h4>
          <div><strong>ID:</strong> {product.id}</div>
          <div><strong>Ngày tạo (gần đúng):</strong> {product.created_at || '—'}</div>
          <div><strong>Mô tả từ raw:</strong> {(rawRows && rawRows[0] && rawRows[0].product_description) || '—'}</div>
        </div>
      </div>

      <div style={{ marginTop:16, display:'flex', gap:12 }}>
        <div style={{ flex:1, background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Giao dịch (mới nhất)</h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'#f3f7fb' }}><tr><th style={{ padding:8 }}>Loại</th><th style={{ padding:8 }}>Số lượng</th><th style={{ padding:8 }}>Ngày</th><th style={{ padding:8 }}>Kho</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}><td style={{ padding:8 }}>{t.type}</td><td style={{ padding:8 }}>{formatNumber(t.amount)}</td><td style={{ padding:8 }}>{formatDate(t.date)}</td><td style={{ padding:8 }}>{t.warehouse_id || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex:1, background:'#fff', padding:12, borderRadius:8 }}>
          <h4>Doanh thu (mới nhất)</h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'#f3f7fb' }}><tr><th style={{ padding:8 }}>Số lượng</th><th style={{ padding:8 }}>Đơn giá</th><th style={{ padding:8 }}>Tổng</th><th style={{ padding:8 }}>Ngày</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}><td style={{ padding:8 }}>{formatNumber(s.quantity)}</td><td style={{ padding:8 }}>{formatCurrency(s.unit_price || 0)}</td><td style={{ padding:8 }}>{formatCurrency(s.total || 0)}</td><td style={{ padding:8 }}>{formatDate(s.date)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw data section hidden as requested */}

    </div>
  );
}
