import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');


  useEffect(() => {
    axios.get('https://inventory-ai-4pfd.onrender.com/api/products').then(res => setProducts(res.data));
  }, []);

  const refreshProducts = () => {
    axios.get('https://inventory-ai-4pfd.onrender.com/api/products').then(res => setProducts(res.data));
  };

  const addProduct = () => {
    axios.post('https://inventory-ai-4pfd.onrender.com/api/products', { name, sku, quantity }).then(() => {
      refreshProducts();
      setName(''); setSku(''); setQuantity(0);
    });
  };

  const editProduct = (id, name, sku) => {
    setEditId(id);
    setEditName(name);
    setEditSku(sku);
  };

  const saveEditProduct = () => {
    axios.put(`https://inventory-ai-4pfd.onrender.com/api/products/${editId}/edit`, { name: editName, sku: editSku }).then(() => {
      refreshProducts();
      setEditId(null);
    });
  };

  const deleteProduct = (id) => {
    axios.delete(`https://inventory-ai-4pfd.onrender.com/api/products/${id}`).then(() => refreshProducts());
  };

  // Lọc và sắp xếp
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'quantity') {
      return sortDir === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
    }
    const aVal = a[sortBy].toLowerCase();
    const bVal = b[sortBy].toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Xuất Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sorted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products.xlsx');
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 32, marginBottom: 32, boxShadow: '0 4px 24px #0002' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 24, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Quản lý sản phẩm</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tìm kiếm tên hoặc SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tên sản phẩm" value={name} onChange={e => setName(e.target.value)} />
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="SKU" value={sku} onChange={e => setSku(e.target.value)} />
        <input style={{ width: 120, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} type="number" placeholder="Số lượng" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
        <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={addProduct}>Thêm</button>
        <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={exportExcel}>Xuất Excel</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
        <thead style={{ background: '#eaf1fb' }}>
          <tr>
            <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Tên {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('sku'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>SKU {sortBy === 'sku' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('quantity'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Số lượng {sortBy === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th style={{ padding: 12 }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editName} onChange={e => setEditName(e.target.value)} /> : p.name}</td>
              <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editSku} onChange={e => setEditSku(e.target.value)} /> : p.sku}</td>
              <td style={{ padding: 10 }}>{p.quantity}</td>
              <td style={{ padding: 10 }}>
                {editId === p.id ? (
                  <>
                    <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={saveEditProduct}>Lưu</button>
                    <button style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }} onClick={() => setEditId(null)}>Hủy</button>
                  </>
                ) : (
                  <>
                    <button style={{ background: '#ffc107', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={() => editProduct(p.id, p.name, p.sku)}>Sửa</button>
                    <button style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={() => deleteProduct(p.id)}>Xóa</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ color: '#888', fontSize: 15 }}>Tổng số sản phẩm: {sorted.length}</div>
    </div>
  );
}