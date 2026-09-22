import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Đang xác nhận email của bạn...');

  useEffect(() => {
    const confirmEmail = async () => {
      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (!email || !token) {
        setStatus('error');
        setMessage('Đường dẫn xác nhận không hợp lệ.');
        return;
      }

      try {
        await api.get(`/auth/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
        setStatus('success');
        setMessage('Xác nhận email thành công! Tài khoản của bạn đã được kích hoạt.');
      } catch (err) {
        setStatus('error');
        setMessage('Xác nhận email thất bại. Token có thể đã hết hạn hoặc không hợp lệ.');
      }
    };

    confirmEmail();
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 className="auth-logo">Travel Workspace</h1>
        <h2 className="auth-title">Xác nhận Email</h2>
        
        <div style={{ margin: '20px 0', fontSize: '16px', color: status === 'error' ? 'red' : (status === 'success' ? 'green' : '#333') }}>
          {message}
        </div>

        {status !== 'loading' && (
          <Link to="/login" className="btn-primary w-full" style={{ display: 'inline-block', textDecoration: 'none', boxSizing: 'border-box' }}>
            Đi đến trang Đăng nhập
          </Link>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
