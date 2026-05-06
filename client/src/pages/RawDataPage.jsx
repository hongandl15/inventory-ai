import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function RawDataPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  useEffect(()=>{ load(); }, []);
  const load = () => {
    setLoading(true);
    axios.get(`${API_BASE}/api/rawdb`).then(res => setRows(res.data || [])).catch(()=>setRows([])).finally(()=>setLoading(false));
  };

  if (loading) return <div className="card">Đang tải dữ liệu...</div>;
  if (!rows || rows.length === 0) return <div className="card">Không có dữ liệu thô để hiển thị.</div>;

  const headers = Object.keys(rows[0]);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const start = (page-1)*perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <div style={{ background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', borderRadius: 12, padding: 24 }}>
      <h2 style={{ color: '#0078d4' }}>Dữ liệu gốc (data.csv)</h2>
      <div style={{ marginBottom: 12, color: '#666' }}>Hiển thị {rows.length} bản ghi — trang {page} / {totalPages}</div>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, padding: 8 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#f3f7fb' }}>
            <tr>
              {headers.map(h => <th key={h} style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, idx) => (
              <tr key={start + idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                {headers.map(h => <td key={h} style={{ padding: 8, verticalAlign: 'top', maxWidth: 420 }}>{r[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="button">Prev</button>
        <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="button">Next</button>
        <div style={{ marginLeft: 'auto', color: '#666' }}>Tải lại dữ liệu: <button onClick={load} className="button">Reload</button></div>
      </div>
    </div>
  );
}
