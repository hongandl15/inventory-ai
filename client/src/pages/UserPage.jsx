import React, { useState } from 'react';
import axios from 'axios';

export default function UserPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  const register = () => {
     axios.post('http://localhost:3001/api/users/register', { username, password }).then(() => alert('Đăng ký thành công!'));
  };

  const login = () => {
     axios.post('http://localhost:3001/api/users/login', { username, password }).then(res => setUser(res.data)).catch(() => alert('Đăng nhập thất bại'));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ color: '#0078d4', marginBottom: 16 }}>Quản lý người dùng</h2>
      {user ? (
        <div style={{ color: '#28a745', fontWeight: 600 }}>Xin chào, {user.username} ({user.role})</div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <input style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} placeholder="Tên đăng nhập" value={username} onChange={e => setUsername(e.target.value)} />
          <input style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #d0d7de' }} type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} />
          <button style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={register}>Đăng ký</button>
          <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }} onClick={login}>Đăng nhập</button>
        </div>
      )}
    </div>
  );
}