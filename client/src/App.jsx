import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProductPage from './pages/ProductPage.jsx';
import TransactionPage from './pages/TransactionPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import AIPage from './pages/AIPage.jsx';
import UserPage from './pages/UserPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <div style={{ maxWidth: 1000, margin: 'auto', padding: 30, fontFamily: 'Segoe UI, Arial, sans-serif', background: '#f5f7fa', borderRadius: 12, boxShadow: '0 4px 24px #0001' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ color: '#2d3a4a', margin: 0 }}>Inventory Management <span style={{ color: '#0078d4' }}>AI & RAG</span></h1>
            <div style={{ color: '#6c7a89', fontSize: 16 }}>Quản lý hàng tồn kho thông minh cho doanh nghiệp nhỏ</div>
          </div>
          <img src="https://img.icons8.com/color/96/box.png" alt="Inventory" style={{ height: 48 }} />
        </header>
        <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <Link to="/" style={{ color: '#0078d4', fontWeight: 600 }}>Sản phẩm</Link>
          <Link to="/transaction" style={{ color: '#0078d4', fontWeight: 600 }}>Nhập/Xuất kho</Link>
          <Link to="/report" style={{ color: '#0078d4', fontWeight: 600 }}>Báo cáo</Link>
          <Link to="/ai" style={{ color: '#0078d4', fontWeight: 600 }}>AI & Chatbot</Link>
          <Link to="/user" style={{ color: '#0078d4', fontWeight: 600 }}>Người dùng</Link>
        </nav>
        <Routes>
          <Route path="/" element={<ProductPage />} />
          <Route path="/transaction" element={<TransactionPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/user" element={<UserPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;