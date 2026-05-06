import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';
import { formatNumber, formatCurrency, formatDate } from '../utils/format';
import * as XLSX from 'xlsx';

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pages, setPages] = useState({});
  const [serverItems, setServerItems] = useState([]);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalItems, setServerTotalItems] = useState(0);


  useEffect(() => {
    // fetch warehouses and default to first warehouse
    axios.get(`${API_BASE}/api/warehouses`).then(res => {
      setWarehouses(res.data || []);
      if ((!warehouseFilter || warehouseFilter === '') && Array.isArray(res.data) && res.data.length) {
        setWarehouseFilter(String(res.data[0].id));
      }
    }).catch(()=>{});
    // initial products fetch
    refreshProducts();
  }, []);

  // refresh when relevant params change
  useEffect(() => {
    refreshProducts();
  }, [warehouseFilter, page, perPage, search, sortBy, sortDir]);

  const refreshProducts = async () => {
    try {
      if (warehouseFilter && warehouseFilter !== 'all') {
        const res = await axios.get(`${API_BASE}/api/products/paginated`, { params: { warehouse_id: warehouseFilter, page, perPage, q: search, sortBy, sortDir } });
        setServerItems(res.data.items || []);
        setServerTotalPages(res.data.totalPages || 1);
        setServerTotalItems(res.data.total || 0);
      } else {
        const res = await axios.get(`${API_BASE}/api/products`);
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('refreshProducts error', err?.message || err);
    }
  };

  const addProduct = () => {
    const price = priceInput === '' ? null : Number(priceInput);
    axios.post(`${API_BASE}/api/products`, { name, sku, quantity, warehouse_id: warehouseFilter === 'all' ? null : warehouseFilter, price }).then(() => {
      refreshProducts();
      setName(''); setSku(''); setQuantity(0); setPriceInput('');
    });
  };

  const editProduct = (id, name, sku) => {
    setEditId(id);
    setEditName(name);
    setEditSku(sku);
  };

  const saveEditProduct = () => {
    axios.put(`${API_BASE}/api/products/${editId}/edit`, { name: editName, sku: editSku }).then(() => {
      refreshProducts();
      setEditId(null);
    });
  };

  const deleteProduct = (id) => {
    axios.delete(`${API_BASE}/api/products/${id}`).then(() => refreshProducts());
  };

  // Lọc và sắp xếp
  const filtered = products.filter(p =>
    (warehouseFilter === 'all' || String(p.warehouse_id) === String(warehouseFilter)) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
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

  // pagination for single-warehouse table
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  // reset page when filters/size change
  React.useEffect(() => { setPage(1); setPages({}); }, [warehouseFilter, search, sortBy, sortDir, perPage]);

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
        <select value={warehouseFilter} onChange={e=>setWarehouseFilter(e.target.value)} style={{ width:160, padding:10, borderRadius:6, border:'1px solid #b0b8c1' }}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tìm kiếm tên hoặc SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Tên sản phẩm" value={name} onChange={e => setName(e.target.value)} />
        <input style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="SKU" value={sku} onChange={e => setSku(e.target.value)} />
        <input style={{ width: 120, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} type="number" placeholder="Số lượng" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
        <input style={{ width: 160, padding: 10, borderRadius: 6, border: '1px solid #b0b8c1', fontSize: 16 }} placeholder="Giá bán" value={priceInput} onChange={e => setPriceInput(e.target.value)} />
        <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={addProduct}>Thêm</button>
        <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 16 }} onClick={exportExcel}>Xuất Excel</button>
      </div>
      {warehouseFilter === 'all' ? (
        <div>
          {warehouses.concat([{ id: 'unassigned', name: 'Chưa gán' }]).map(w => {
            const gid = w.id === 'unassigned' ? null : w.id;
            const group = filtered.filter(p => (gid === null ? !p.warehouse_id : String(p.warehouse_id) === String(gid)));
            if (group.length === 0) return null;
            const totalItemsG = group.length;
            const totalPagesG = Math.max(1, Math.ceil(totalItemsG / perPage));
            const currentPageG = pages[w.id] || 1;
            const paginatedGroup = group.slice((currentPageG - 1) * perPage, currentPageG * perPage);
            return (
              <div key={w.id} style={{ marginBottom: 12 }}>
                <h4 style={{ marginBottom: 6 }}>{w.name} ({group.length})</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
                  <thead style={{ background: '#eaf1fb' }}>
                    <tr>
                      <th style={{ padding: 12 }}>STT</th>
                      <th style={{ padding: 12 }}>Tên</th>
                      <th style={{ padding: 12 }}>SKU</th>
                      <th style={{ padding: 12 }}>Số lượng</th>
                      <th style={{ padding: 12 }}>Giá bán</th>
                      <th style={{ padding: 12 }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGroup.map((p, idx) => (
                      <tr key={p.sku} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 10 }}>{(currentPageG - 1) * perPage + idx + 1}</td>
                        <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editName} onChange={e => setEditName(e.target.value)} /> : <Link to={`/product/${p.id}`}>{p.name}</Link>}</td>
                        <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editSku} onChange={e => setEditSku(e.target.value)} /> : p.sku}</td>
                        <td style={{ padding: 10 }}>{formatNumber(p.quantity)}</td>
                        <td style={{ padding: 10 }}>{p.price == null ? '—' : formatCurrency(p.price)}</td>
                        <td style={{ padding: 10 }}>
                          {editId === p.id ? (
                            <>
                              <button type="button" style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={saveEditProduct}>Lưu</button>
                              <button type="button" style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }} onClick={() => setEditId(null)}>Hủy</button>
                            </>
                          ) : (
                            <>
                              <Link to={`/product/${p.id}`}><button type="button" style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, background: '#17a2b8', color: '#fff', border: 'none' }}>Xem</button></Link>
                              <button type="button" style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, background: '#ffc107', color: '#fff', border: 'none' }} onClick={() => editProduct(p.id, p.name, p.sku)}>Sửa</button>
                              <button type="button" style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, background: '#dc3545', color: '#fff', border: 'none' }} onClick={() => deleteProduct(p.id)}>Xóa</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button disabled={currentPageG <= 1} onClick={() => {
                    setPages(prev => {
                      const cur = prev[w.id] || 1;
                      const copy = { ...prev };
                      copy[w.id] = Math.max(1, cur - 1);
                      return copy;
                    });
                  }} className="button">Prev</button>
                  <button disabled={currentPageG >= totalPagesG} onClick={() => {
                    setPages(prev => {
                      const cur = prev[w.id] || 1;
                      const copy = { ...prev };
                      copy[w.id] = Math.min(totalPagesG, cur + 1);
                      return copy;
                    });
                  }} className="button">Next</button>
                  <div style={{ marginLeft: 'auto', color: '#666' }}>Trang {currentPageG} / {totalPagesG}</div>
                  <div style={{ marginLeft: 8, color: '#666' }}>20 / trang</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
          <thead style={{ background: '#eaf1fb' }}>
            <tr>
              <th style={{ padding: 12 }}>STT</th>
              <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Tên {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('sku'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>SKU {sortBy === 'sku' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { setSortBy('quantity'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Số lượng {sortBy === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th style={{ padding: 12 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {(warehouseFilter === 'all' ? paginated : serverItems).map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{(page - 1) * perPage + idx + 1}</td>
                <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editName} onChange={e => setEditName(e.target.value)} /> : <Link to={`/product/${p.id}`}>{p.name}</Link>}</td>
                <td style={{ padding: 10 }}>{editId === p.id ? <input style={{ padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} value={editSku} onChange={e => setEditSku(e.target.value)} /> : p.sku}</td>
                <td style={{ padding: 10 }}>{formatNumber(p.quantity)}</td>
                <td style={{ padding: 10 }}>
                  {editId === p.id ? (
                    <>
                      <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={saveEditProduct}>Lưu</button>
                      <button style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }} onClick={() => setEditId(null)}>Hủy</button>
                    </>
                  ) : (
                    <>
                      <Link to={`/product/${p.id}`}><button style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }}>Xem</button></Link>
                      <button style={{ background: '#ffc107', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={() => editProduct(p.id, p.name, p.sku)}>Sửa</button>
                      <button style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginRight: 6 }} onClick={() => deleteProduct(p.id)}>Xóa</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="button">Prev</button>
          <button disabled={page >= (warehouseFilter === 'all' ? totalPages : serverTotalPages)} onClick={() => setPage(p => Math.min((warehouseFilter === 'all' ? totalPages : serverTotalPages), p + 1))} className="button">Next</button>
          <div style={{ marginLeft: 'auto', color: '#666' }}>Trang {page} / {(warehouseFilter === 'all' ? totalPages : serverTotalPages)}</div>
          <div style={{ marginLeft: 8, color: '#666' }}>20 / trang</div>
        </div>
        </>
      )}
      <div style={{ color: '#888', fontSize: 15 }}>Tổng số sản phẩm: {warehouseFilter === 'all' ? sorted.length : serverTotalItems}</div>
    </div>
  );
}