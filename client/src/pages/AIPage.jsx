import React, { useState } from 'react';
import axios from 'axios';

export default function AIPage() {
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState('');
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState('');

  const askRAG = () => {
    axios.post('http://localhost:3001/api/rag', { query: ragQuery }).then(res => setRagResult(res.data.result));
  };

  const askAI = () => {
    axios.post('http://localhost:3001/api/ai', { query }).then(res => setAiResult(res.data.result));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 16 }}>Chatbot RAG & AI</h2>
      <input style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d0d7de', marginBottom: 8 }} placeholder="Hỏi chatbot về tồn kho..." value={ragQuery} onChange={e => setRagQuery(e.target.value)} />
      <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={askRAG}>Gửi RAG</button>
      <div style={{ marginTop: 10, background: '#eaf1fb', padding: 12, borderRadius: 4, minHeight: 40 }}>{ragResult}</div>
      <h2 style={{ color: '#0078d4', marginTop: 32 }}>Truy vấn AI</h2>
      <input style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d0d7de', marginBottom: 8 }} placeholder="Hỏi về tồn kho..." value={query} onChange={e => setQuery(e.target.value)} />
      <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={askAI}>Gửi AI</button>
      <div style={{ marginTop: 10, background: '#eaf1fb', padding: 12, borderRadius: 4, minHeight: 40 }}>{aiResult}</div>
    </div>
  );
}