import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import * as XLSX from 'xlsx';

export default function TransactionPage() {
  const [inOutProduct, setInOutProduct] = useState('');
  const [inOutType, setInOutType] = useState('in');
  const [inOutAmount, setInOutAmount] = useState(0);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
      axios.get(`${API_BASE}/api/products`).then(res => setProducts(res.data));
      axios.get(`${API_BASE}/api/warehouses`).then(res => setWarehouses(res.data)).catch(()=>{});
      // load all transactions by default
      axios.get(`${API_BASE}/api/transactions`).then(res => setHistory(res.data)).catch(()=>{});
    }, []);

  const handleInOut = () => {
     axios.post(`${API_BASE}/api/transactions`, {
      product_id: inOutProduct,
      type: inOutType,
      amount: inOutAmount
    }).then(() => {
      setInOutProduct(''); setInOutAmount(0);
      showHistory(inOutProduct);
    });
  };

    const showHistory = (id) => {
      axios.get(`${API_BASE}/api/transactions/${id}`).then(res => setHistory(res.data));
    };

  // Lọc và sắp xếp
  const filtered = history.filter(h =>
    (!search || (h.type.includes(search) || String(h.amount).includes(search) || h.date.includes(search)))
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'amount') {
      return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    if (sortBy === 'date') {
      return sortDir === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    }
    return 0;
  });

  // Xuất Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sorted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transactions.xlsx');
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 32, marginBottom: 32, boxShadow: '0 4px 24px #0002' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 24, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Nhập / Xuất kho</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <select style={{ width: 200, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} value={warehouseFilter} onChange={e=>setWarehouseFilter(e.target.value)}>
          <option value="all">Tất cả kho</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} value={inOutProduct} onChange={e => setInOutProduct(e.target.value)}>
          <option value="">Chọn sản phẩm</option>
          {products.filter(p => warehouseFilter==='all' || String(p.warehouse_id)===String(warehouseFilter)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ width: 140, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} value={inOutType} onChange={e => setInOutType(e.target.value)}>
          <option value="in">Nhập kho</option>
          <option value="out">Xuất kho</option>
        </select>
        <input style={{ width: 120, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} type="number" placeholder="Số lượng" value={inOutAmount} onChange={e => setInOutAmount(Number(e.target.value))} />
        <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={handleInOut}>Ghi nhận</button>
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tìm kiếm giao dịch..." value={search} onChange={e => setSearch(e.target.value)} />
        <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={exportExcel}>Xuất Excel</button>
      </div>
      {sorted.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#2d3a4a', fontWeight: 600 }}>Lịch sử giao dịch</h3>
          {warehouseFilter === 'all' ? (
            // Group history by warehouse
            warehouses.concat([{ id: 'unassigned', name: 'Chưa gán' }]).map(w => {
              const gid = w.id === 'unassigned' ? null : w.id;
              const group = sorted.filter(t => (gid === null ? !t.warehouse_id : String(t.warehouse_id) === String(gid)));
              if (group.length === 0) return null;
              return (
                <div key={w.id} style={{ marginBottom: 12 }}>
                  <h4 style={{ marginBottom: 6 }}>{w.name} ({group.length})</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
                    <thead style={{ background: '#eaf1fb' }}>
                      <tr>
                        <th style={{ padding: 12 }}>Loại</th>
                        <th style={{ padding: 12 }}>Số lượng</th>
                        <th style={{ padding: 12 }}>Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 10 }}>{h.type === 'in' ? 'Nhập' : 'Xuất'}</td>
                          <td style={{ padding: 10 }}>{h.amount}</td>
                          <td style={{ padding: 10 }}>{h.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
              <thead style={{ background: '#eaf1fb' }}>
                <tr>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('type'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Loại</th>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('amount'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Số lượng {sortBy === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Ngày {sortBy === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{h.type === 'in' ? 'Nhập' : 'Xuất'}</td>
                    <td style={{ padding: 10 }}>{h.amount}</td>
                    <td style={{ padding: 10 }}>{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}