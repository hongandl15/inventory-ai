import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Link } from 'react-router-dom';

const sampleDashboard = [
  { name: 'Tồn kho thấp', value: 0 },
  { name: 'Tồn kho đủ', value: 0 },
  { name: 'Tồn kho cao', value: 0 },
];

// productData will be fetched from server

const COLORS = ['#0078d4', '#28a745', '#ffc107'];

export default function AIPage() {
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState('');
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState(sampleDashboard);

  

  const askRAG = () => {
    axios.post(`${API_BASE}/api/rag`, { query: ragQuery }).then(res => setRagResult(res.data.result));
  };

  const askAI = () => {
    axios.post(`${API_BASE}/api/ai`, { query }).then(res => setAiResult(res.data.result));
  };

  useEffect(() => {
    // fetch products from local server
    axios.get(`${API_BASE}/api/products`).then(res => {
      const data = res.data || [];
      setProducts(data);
      // compute dashboard: thresholds (example): low <50, medium 50-150, high >150
      let low = 0, mid = 0, high = 0;
      data.forEach(p => {
        const q = Number(p.quantity) || 0;
        if (q < 50) low++;
        else if (q <= 150) mid++;
        else high++;
      });
      setDashboard([
        { name: 'Tồn kho thấp', value: low },
        { name: 'Tồn kho đủ', value: mid },
        { name: 'Tồn kho cao', value: high },
      ]);
    }).catch(()=>{
      // ignore errors; keep samples
    });
  }, []);

  // prepare top products for bar chart (top 10 by quantity)
  const chartData = products.slice().sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)).slice(0, 10).map(p => ({ name: p.name, quantity: Number(p.quantity) || 0 }));

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 16 }}>Thống kê</h2>
      {/* Dashboard section */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#0078d4', fontWeight: 600, fontSize: 18 }}>Tồn kho thấp</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard[0]?.value || 0}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#28a745', fontWeight: 600, fontSize: 18 }}>Tồn kho đủ</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard[1]?.value || 0}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#ffc107', fontWeight: 600, fontSize: 18 }}>Tồn kho cao</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard[2]?.value || 0}</div>
        </div>
      </div>
      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ margin: '6px 0 10px', color: '#0078d4' }}>Biểu đồ tồn kho</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: '#eaf1fb', padding: 10, borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: '#0078d4' }}>Tồn kho thấp</div>
            <div style={{ fontWeight: 700 }}>{dashboard[0]?.value || 0}</div>
          </div>
          <div style={{ background: '#eaf1fb', padding: 10, borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: '#28a745' }}>Tồn kho đủ</div>
            <div style={{ fontWeight: 700 }}>{dashboard[1]?.value || 0}</div>
          </div>
          <div style={{ background: '#eaf1fb', padding: 10, borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: '#ffc107' }}>Tồn kho cao</div>
            <div style={{ fontWeight: 700 }}>{dashboard[2]?.value || 0}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Link to="/charts"><button style={{ background: '#0078d4', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontWeight: 600 }}>Xem biểu đồ đầy đủ</button></Link>
          </div>
        </div>
      </div>
      <h2 style={{ color: '#0078d4', marginTop: 32 }}>Truy vấn AI</h2>
      <input style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d0d7de', marginBottom: 8 }} placeholder="Hỏi về tồn kho..." value={query} onChange={e => setQuery(e.target.value)} />
      <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={askAI}>Gửi AI</button>
      <div style={{ marginTop: 10, background: '#eaf1fb', padding: 12, borderRadius: 4, minHeight: 40, whiteSpace: 'pre-wrap' }}>{aiResult}</div>
    </div>
  );
}