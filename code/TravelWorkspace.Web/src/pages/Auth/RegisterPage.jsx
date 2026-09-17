import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { fullName, email, password });
      alert('Đăng ký thành công! Một Email chứa thông tin chào mừng vừa được gửi đến hòm thư của bạn. Vui lòng đăng nhập để tiếp tục.');
      navigate('/login');
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Không thể kết nối đến Backend (Lỗi mạng).');
      } else if (err.response && err.response.status === 500) {
        setError('Lỗi máy chủ (Server Error 500). Xin kiểm tra Backend (Database có thể chưa tạo).');
      } else {
        setError('Đăng ký thất bại. Email có thể đã tồn tại.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Travel Workspace</h1>
        <h2 className="auth-title">Tạo tài khoản mới</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>HỌ VÀ TÊN</label>
            <input 
              type="text" 
              className="form-input" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required 
            />
          </div>
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
          <button type="submit" className="btn-primary w-full">Đăng ký</button>
        </form>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
