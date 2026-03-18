import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const sampleDashboard = [
  { name: 'Tồn kho thấp', value: 5 },
  { name: 'Tồn kho đủ', value: 18 },
  { name: 'Tồn kho cao', value: 7 },
];

const sampleData = [
  { name: 'Sản phẩm A', tồn_kho: 120 },
  { name: 'Sản phẩm B', tồn_kho: 80 },
  { name: 'Sản phẩm C', tồn_kho: 200 },
  { name: 'Sản phẩm D', tồn_kho: 60 },
];

const COLORS = ['#0078d4', '#28a745', '#ffc107'];

export default function AIPage() {
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState('');
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState('');

  const askRAG = () => {
    axios.post('https://inventory-ai-4pfd.onrender.com/api/rag', { query: ragQuery }).then(res => setRagResult(res.data.result));
  };

  const askAI = () => {
    axios.post('https://inventory-ai-4pfd.onrender.com/api/ai', { query }).then(res => setAiResult(res.data.result));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 16 }}>Chatbot RAG & AI</h2>
      {/* Dashboard section */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#0078d4', fontWeight: 600, fontSize: 18 }}>Tồn kho thấp</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sampleDashboard[0].value}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#28a745', fontWeight: 600, fontSize: 18 }}>Tồn kho đủ</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sampleDashboard[1].value}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px #0001' }}>
          <div style={{ color: '#ffc107', fontWeight: 600, fontSize: 18 }}>Tồn kho cao</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sampleDashboard[2].value}</div>
        </div>
      </div>
      {/* Diagram section */}
      <div style={{ width: '100%', height: 320, marginBottom: 32, background: '#f5f7fa', borderRadius: 8, padding: 16 }}>
        <h3 style={{ color: '#0078d4', marginBottom: 12 }}>Biểu đồ tồn kho sản phẩm</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sampleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tồn_kho" fill="#0078d4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ width: '100%', height: 320, marginBottom: 32, background: '#f5f7fa', borderRadius: 8, padding: 16 }}>
        <h3 style={{ color: '#0078d4', marginBottom: 12 }}>Tỷ lệ tồn kho</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={sampleDashboard} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {sampleDashboard.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <h2 style={{ color: '#0078d4', marginTop: 32 }}>Truy vấn AI</h2>
      <input style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d0d7de', marginBottom: 8 }} placeholder="Hỏi về tồn kho..." value={query} onChange={e => setQuery(e.target.value)} />
      <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={askAI}>Gửi AI</button>
      <div style={{ marginTop: 10, background: '#eaf1fb', padding: 12, borderRadius: 4, minHeight: 40 }}>{aiResult}</div>
    </div>
  );
}