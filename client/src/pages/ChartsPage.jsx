import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0078d4', '#28a745', '#ffc107'];

export default function ChartsPage() {
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState([
    { name: 'Tồn kho thấp', value: 0 },
    { name: 'Tồn kho đủ', value: 0 },
    { name: 'Tồn kho cao', value: 0 },
  ]);

  useEffect(() => {
    axios.get(`${API_BASE}/api/products`).then(res => {
      const data = res.data || [];
      setProducts(data);
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
    }).catch(()=>{});
  }, []);

  const chartData = products.slice().sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)).slice(0, 10).map(p => ({ name: p.name, quantity: Number(p.quantity) || 0 }));

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 16 }}>Biểu đồ & Thống kê</h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 140, textAlign: 'center' }}>
          <div style={{ color: '#0078d4', fontWeight: 600 }}>Tồn kho thấp</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard[0]?.value || 0}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 140, textAlign: 'center' }}>
          <div style={{ color: '#28a745', fontWeight: 600 }}>Tồn kho đủ</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard[1]?.value || 0}</div>
        </div>
        <div style={{ background: '#eaf1fb', borderRadius: 8, padding: 18, minWidth: 140, textAlign: 'center' }}>
          <div style={{ color: '#ffc107', fontWeight: 600 }}>Tồn kho cao</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard[2]?.value || 0}</div>
        </div>
      </div>

      <div style={{ width: '100%', height: 340, marginBottom: 24, background: '#f5f7fa', borderRadius: 8, padding: 12 }}>
        <h3 style={{ color: '#0078d4', marginBottom: 8 }}>Top sản phẩm theo số lượng</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantity" fill="#0078d4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: '100%', height: 320, marginBottom: 8, background: '#f5f7fa', borderRadius: 8, padding: 12 }}>
        <h3 style={{ color: '#0078d4', marginBottom: 8 }}>Tỷ lệ tồn kho</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={dashboard} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {dashboard.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
