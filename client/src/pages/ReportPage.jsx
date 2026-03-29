import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import * as XLSX from 'xlsx';

export default function ReportPage() {
  const [report, setReport] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transReport, setTransReport] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

    const getReport = () => {
      axios.get(`${API_BASE}/api/products`).then(res => {
        const data = res.data || [];
        const filtered = warehouseFilter === 'all' ? data : data.filter(p => String(p.warehouse_id) === String(warehouseFilter));
        setReport(filtered);
      });
    };

    const getTransReport = () => {
      axios.get(`${API_BASE}/api/transactions`).then(res => {
        const all = res.data || [];
        const filteredByDate = all.filter(t => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate));
        const filtered = warehouseFilter === 'all' ? filteredByDate : filteredByDate.filter(t => String(t.warehouse_id) === String(warehouseFilter));
        setTransReport(filtered);
      });
    };

    // load warehouses for filtering
    React.useEffect(()=>{
      axios.get(`${API_BASE}/api/warehouses`).then(res => setWarehouses(res.data)).catch(()=>{});
    },[]);

  // Lọc và sắp xếp tồn kho
  const filtered = report.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.sku.toLowerCase().includes(search.toLowerCase())
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

  // Xuất Excel tồn kho
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sorted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory_report.xlsx');
  };

  // Thống kê nhanh
  const totalProducts = sorted.length;
  const totalQuantity = sorted.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 32, marginBottom: 32, boxShadow: '0 4px 24px #0002' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 24, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Báo cáo tổng hợp</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <select value={warehouseFilter} onChange={e=>setWarehouseFilter(e.target.value)} style={{ width:160, padding:10, borderRadius:6, border:'1px solid #b0b8c1' }}>
          <option value="all">Tất cả kho</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tìm kiếm tên hoặc SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={getReport}>Xem tồn kho</button>
        <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={exportExcel}>Xuất Excel</button>
      </div>
      <div style={{ display: 'flex', gap: 32, marginBottom: 18 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 2px 8px #0001', minWidth: 180 }}>
          <div style={{ color: '#0078d4', fontWeight: 600, fontSize: 18 }}>Tổng sản phẩm</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalProducts}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 2px 8px #0001', minWidth: 180 }}>
          <div style={{ color: '#0078d4', fontWeight: 600, fontSize: 18 }}>Tổng số lượng</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalQuantity}</div>
        </div>
      </div>
      {sorted.length > 0 && (
        <div>
          {warehouseFilter === 'all' ? (
            warehouses.concat([{ id: 'unassigned', name: 'Chưa gán' }]).map(w => {
              const gid = w.id === 'unassigned' ? null : w.id;
              const group = sorted.filter(p => (gid === null ? !p.warehouse_id : String(p.warehouse_id) === String(gid)));
              if (group.length === 0) return null;
              return (
                <div key={w.id} style={{ marginBottom: 12 }}>
                  <h4 style={{ marginBottom: 6 }}>{w.name} ({group.length})</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
                    <thead style={{ background: '#eaf1fb' }}>
                      <tr>
                        <th style={{ padding: 12 }}>Tên</th>
                        <th style={{ padding: 12 }}>SKU</th>
                        <th style={{ padding: 12 }}>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map(r => (
                        <tr key={r.sku} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 10 }}>{r.name}</td>
                          <td style={{ padding: 10 }}>{r.sku}</td>
                          <td style={{ padding: 10 }}>{r.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
              <thead style={{ background: '#eaf1fb' }}>
                <tr>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Tên {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('sku'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>SKU {sortBy === 'sku' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('quantity'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Số lượng {sortBy === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.sku} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{r.name}</td>
                    <td style={{ padding: 10 }}>{r.sku}</td>
                    <td style={{ padding: 10 }}>{r.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <h2 style={{ color: '#0078d4', marginTop: 32, marginBottom: 18 }}>Báo cáo giao dịch</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={warehouseFilter} onChange={e=>setWarehouseFilter(e.target.value)} style={{ width:160, padding:10, borderRadius:6, border:'1px solid #b0b8c1' }}>
          <option value="all">Tất cả kho</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={getTransReport}>Xem giao dịch</button>
      </div>
      {transReport.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
          <thead style={{ background: '#eaf1fb' }}><tr><th style={{ padding: 12 }}>ID sản phẩm</th><th style={{ padding: 12 }}>Loại</th><th style={{ padding: 12 }}>Số lượng</th><th style={{ padding: 12 }}>Ngày</th><th style={{ padding: 12 }}>Kho</th></tr></thead>
          <tbody>
            {transReport.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 10 }}>{t.product_id}</td><td style={{ padding: 10 }}>{t.type === 'in' ? 'Nhập' : 'Xuất'}</td><td style={{ padding: 10 }}>{t.amount}</td><td style={{ padding: 10 }}>{t.date}</td><td style={{ padding: 10 }}>{warehouses.find(w=>w.id===t.warehouse_id)?.name || ''}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}