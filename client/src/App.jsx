import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from './config';
import './styles.css';
import ProductPage from './pages/ProductPage.jsx';
import TransactionPage from './pages/TransactionPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import AIPage from './pages/AIPage.jsx';
import ChartsPage from './pages/ChartsPage.jsx';
import UserPage from './pages/UserPage.jsx';
import WarehousePage from './pages/WarehousePage.jsx';
import RevenuePage from './pages/RevenuePage.jsx';

function App() {
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const askAI = () => {
    if (!aiQuery) return;
    setAiLoading(true);
    axios.post(`${API_BASE}/api/ai`, { query: aiQuery }).then(res => {
      setAiResult(res.data.result || '');
    }).catch(() => setAiResult('Lỗi khi gọi AI')).finally(() => setAiLoading(false));
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <img src="https://img.icons8.com/fluency/96/box.png" alt="Inventory" />
            <div>
              <h1 className="site-title">Inventory Management <span style={{ color: 'var(--primary)' }}>Pro</span></h1>
              <div className="site-sub">Quản lý hàng tồn kho thông minh</div>
            </div>
          </div>

          <nav className="app-nav">
            <NavLink to="/" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Sản phẩm</NavLink>
            <NavLink to="/transaction" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Nhập/Xuất</NavLink>
            <NavLink to="/report" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Báo cáo</NavLink>
            <NavLink to="/charts" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Biểu đồ</NavLink>
            <NavLink to="/revenue" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Doanh thu</NavLink>
            <NavLink to="/warehouses" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Kho</NavLink>
            <NavLink to="/user" className={({isActive})=>"nav-link" + (isActive? ' active':'')}>Người dùng</NavLink>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ai-input">
              <input placeholder="Hỏi AI về tồn kho..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} />
              <button onClick={askAI} className="button-primary">{aiLoading ? 'Đang...' : 'Hỏi AI'}</button>
            </div>
            <div className="auth-area">
              <NavLink to="/user" className="auth-button">Đăng nhập</NavLink>
            </div>
          </div>
        </header>

        <div className="banner" />

        {aiResult ? (
          <div className="ai-result">
            <strong>Kết quả AI:</strong>
            <div style={{ marginTop: 8, color: '#2d3a4a' }}>{aiResult}</div>
          </div>
        ) : null}

        <Routes>
          <Route path="/" element={<ProductPage />} />
          <Route path="/transaction" element={<TransactionPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/revenue" element={<RevenuePage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/warehouses" element={<WarehousePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;