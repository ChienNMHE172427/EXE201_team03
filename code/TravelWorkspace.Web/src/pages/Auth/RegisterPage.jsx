import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import ReactGA from 'react-ga4';
import api from '../../services/api';
import './Auth.css';

const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || 'G-38QHGD89YJ';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer;
    if (showSuccessModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showSuccessModal && countdown === 0) {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/register', { fullName, email, password });
      // Gắn User ID chuẩn GA4 config và gửi sự kiện đăng ký thành công lên Google Analytics 4
      ReactGA.set({ user_id: email });
      ReactGA.gtag('config', TRACKING_ID, { user_id: email });
      ReactGA.event('sign_up', { method: 'Email', user_id: email });
      setShowSuccessModal(true);
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Không thể kết nối đến Backend (Lỗi mạng).');
      } else if (err.response && err.response.status === 500) {
        setError('Lỗi máy chủ (Server Error 500). Xin kiểm tra Backend (Database có thể chưa tạo).');
      } else {
        setError('Đăng ký thất bại. Email có thể đã tồn tại.');
      }
    } finally {
      setIsSubmitting(false);
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
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>

      {/* Success Modal UI */}
      {showSuccessModal && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal-card">
            <div className="auth-modal-icon-wrapper">
              <CheckCircle2 size={42} strokeWidth={2.5} />
            </div>
            <h3 className="auth-modal-title">Đăng ký thành công!</h3>
            <p className="auth-modal-desc">
              Chào mừng bạn đến với <strong>Travel Workspace</strong>! Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.
            </p>
            <button 
              type="button" 
              className="btn-primary w-full" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => navigate('/login')}
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight size={18} />
            </button>
            <div className="auth-modal-timer">
              Tự động chuyển trang sau {countdown} giây...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
