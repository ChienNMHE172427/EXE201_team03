import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify({ email: res.data.email, name: res.data.fullName, role: res.data.role }));
      
      if (res.data.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Không thể kết nối đến Backend (Lỗi mạng). Hãy chắc chắn bạn đang chạy API.');
      } else if (err.response && err.response.status === 400) {
        setError('Sai email hoặc mật khẩu.');
      } else if (err.response && err.response.status === 403) {
        setError(err.response.data || 'Tài khoản của bạn đã bị khóa.');
      } else {
        setError('Đăng nhập thất bại. Bạn đã ĐĂNG KÝ tài khoản này chưa?');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Travel Workspace</h1>
        <h2 className="auth-title">Chào mừng trở lại</h2>
        
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>EMAIL</label>
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>MẬT KHẨU</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary w-full">Đăng nhập</button>
        </form>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
