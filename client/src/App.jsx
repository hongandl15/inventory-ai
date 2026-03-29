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

  const renderAiResult = (text) => {
    if (!text) return null;
    const blocks = text.split(/\n\s*\n/);
    return blocks.map((blk, i) => {
      const lines = blk.split('\n').map(l => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every(l => l.startsWith('- '));
      if (isList) {
        return (
          <ul key={i} style={{ margin: '8px 0 8px 20px' }}>
            {lines.map((ln, idx) => <li key={idx}>{ln.replace(/^-\s*/, '')}</li>)}
          </ul>
        );
      }
      return (
        <p key={i} style={{ margin: '8px 0', lineHeight: 1.5 }}>{lines.map((ln, idx) => <span key={idx}>{ln}{idx < lines.length - 1 && <br />}</span>)}</p>
      );
    });
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
          </nav>

          <div className="header-actions">
            <div className="auth-area">
              <NavLink to="/user" className="auth-button">Đăng nhập</NavLink>
            </div>
          </div>
        </header>

        <div className="banner" />

        <div className="ai-panel card">
          <h3>Hỏi AI</h3>
          <div className="ai-sub">Gợi ý: hỏi về tồn kho, báo cáo theo kho, hoặc xu hướng doanh thu.</div>
          <textarea placeholder="Nhập câu hỏi về tồn kho, báo cáo, doanh thu..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} rows={5} />
          <div className="ai-actions">
            <button onClick={askAI} className="button-primary">{aiLoading ? 'Đang...' : 'Hỏi AI'}</button>
            <button onClick={() => { setAiQuery(''); setAiResult(''); }} className="button">Xóa</button>
          </div>

          {aiResult ? (
            <div className="ai-result" style={{ marginTop: 12 }}>
              <strong>Kết quả AI:</strong>
              <div style={{ marginTop: 8, color: '#2d3a4a' }}>{renderAiResult(aiResult)}</div>
            </div>
          ) : null}
        </div>

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