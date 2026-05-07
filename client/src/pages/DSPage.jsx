import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, API_BASE_PREDICTION } from '../config';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// DSPage là trang chính của DS Lab, nơi hiển thị tóm tắt dữ liệu và chạy mô hình dự đoán lợi nhuận
export default function DSPage() {
  // State để lưu trữ dữ liệu tóm tắt từ server
  const [summary, setSummary] = useState(null);
  // State để hiển thị trạng thái loading
  const [loading, setLoading] = useState(true);
  // State để lưu trữ dữ liệu tương quan (đã loại bỏ)
  const [corr, setCorr] = useState(null);
  // State để lưu trữ kết quả dự đoán lợi nhuận
  const [predictions, setPredictions] = useState(null);

  // useEffect để tải dữ liệu tóm tắt khi component mount
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/api/ds/summary`).then(res => {
      setSummary(res.data);
    }).catch(() => setSummary(null)).finally(() => setLoading(false));
  }, []);

  // removed notebook fetches


  
  // Hàm để tải dữ liệu tương quan (đã loại bỏ khỏi giao diện)
  const fetchCorrelation = () => {
    axios.get(`${API_BASE}/api/ds/correlation`).then(r => setCorr(r.data)).catch(()=>setCorr(null));
  };

  // Hàm để chạy mô hình dự đoán lợi nhuận dựa trên giá sản phẩm
  const fetchPredictions = () => {
    axios.get(`${API_BASE_PREDICTION}/api/ds/predict`).then(r => setPredictions(r.data)).catch(()=>setPredictions(null));
  };

  // Hiển thị loading nếu đang tải dữ liệu
  if (loading) return <div className="card" style={{ padding: 20 }}>Đang tải dữ liệu DS...</div>;
  // Hiển thị thông báo nếu không có dữ liệu
  if (!summary) return <div className="card" style={{ padding: 20 }}>Không có dữ liệu tóm tắt.</div>;

  // Giải nén dữ liệu từ summary
  const { products, topCategories, topWarehouses } = summary;
  const feature = "cost"; 
  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Tiêu đề của trang DS Lab */}
      <h2 style={{ color: 'var(--primary)' }}>DS Lab — Tóm tắt dữ liệu</h2>

      {/* Phần hiển thị các thống kê tổng quan về sản phẩm */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {/* Thẻ hiển thị tổng số sản phẩm */}
        <div style={{ flex: 1, background: '#f7fbff', padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#0078d4' }}>Tổng sản phẩm</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{products.total}</div>
        </div>
        {/* Thẻ hiển thị số lượng trung bình và min/max */}
        <div style={{ flex: 1, background: '#f7fffa', padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#28a745' }}>Số lượng trung bình</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{(products.qtyStats.mean || 0).toFixed(2)}</div>
          <div style={{ color: '#666' }}>Min: {products.qtyStats.min} • Max: {products.qtyStats.max}</div>
        </div>
        {/* Thẻ hiển thị giá trung bình và min/max */}
        <div style={{ flex: 1, background: '#fff7ea', padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#ff8c00' }}>Giá trung bình</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{(products.priceStats.mean || 0).toFixed(2)}</div>
          <div style={{ color: '#666' }}>Min: {products.priceStats.min} • Max: {products.priceStats.max}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button style={{ marginLeft: 8 }} className="button" onClick={fetchPredictions}>Chạy mô hình dự đoán</button>
      </div>

      {/* simplified: removed category/warehouse histograms */}

      {/* removed correlation view */}

      <div style={{ marginTop: 18 }}>
        <h3>Bảng dự đoán</h3>
        {predictions === null ? <div>Chưa chạy mô hình.</div> : (
          predictions && predictions.predictions ? (
            <div style={{ overflowX: 'auto', background: '#fff', padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Mô hình đơn biến: predicted_profit = intercept + slope * price</div>
              <div style={{ fontSize: 13, color: '#222', marginBottom: 8 }}>Intercept: {predictions.model.intercept} • Slope: {predictions.model.slope} • Rows used: {predictions.model.trained_on}</div>
              <div style={{ width: '100%', height: 300, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid />
                    <XAxis dataKey="x" name="Price" />
                    <YAxis dataKey="y" name="Profit" />
                    <Tooltip />
                    {/* <Scatter name="Actual" data={predictions.predictions.map(p => ({ x: Number.isFinite(p.cost)?p.cost:null, y: Number.isFinite(p.profit)?p.profit:null }))} fill="#0078d4" /> */}
                    {/* <Scatter name="Predicted" data={predictions.predictions.map(p => ({ x: Number.isFinite(p.cost)?p.cost:null, y: p.predicted }))} fill="#ff8c00" /> */}
                    ["cost", "price", "qty"].map(feature => (
                    <Scatter
                      key={feature}
                      name={`Actual vs Predicted (${feature})`}
                      data={predictions.predictions.map(p => ({
                        x: p[feature],
                        y: p.profit
                      }))}
                    />
                  ))
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>#</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Sản phẩm</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Giá tiêu chuẩn</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Giá bán</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Số lượng</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Profit thực tế (y)</th>
                    <th style={{ border: '1px solid #eee', padding: 6 }}>Profit dự đoán</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.predictions.slice(0,200).map((p, i) => (
                    <tr key={p.id || i}>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{i+1}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{p.name || '—'}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{Number.isFinite(p.cost) ? p.cost : '—'}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{Number.isFinite(p.price) ? p.price : '—'}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{Number.isFinite(p.qty) ? p.qty : '—'}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{Number.isFinite(p.profit) ? p.profit : '—'}</td>
                      <td style={{ border: '1px solid #eee', padding: 6 }}>{p.predicted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div>Không có kết quả dự đoán.</div>
        )}
      </div>

      {/* removed notebook images & notes - simplified view shows only summary + predictions + chart */}
    </div>
  );
}
