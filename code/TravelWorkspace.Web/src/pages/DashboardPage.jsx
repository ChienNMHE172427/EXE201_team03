import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <h2 style={{marginTop: 40}}>Đang tải dữ liệu chuyến đi...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chuyến đi của tôi</h1>
          <p className="page-subtitle">Danh sách các chuyến đi bạn đang tham gia hoặc tổ chức.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/create-trip')}>+ Tạo chuyến đi</button>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: 8 }}>Bạn chưa có chuyến đi nào</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Hãy bắt đầu lên kế hoạch bằng cách tạo chuyến đi đầu tiên nhé.</p>
          <button className="btn-primary" onClick={() => navigate('/create-trip')}>Tạo chuyến đi ngay</button>
        </div>
      ) : (
        <div className="trips-list" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {trips.map(trip => (
            <div key={trip.id} className="hero-banner" style={{ margin: 0 }}>
              <div className="badge">MỚI TẠO</div>
              <h2 className="hero-title">{trip.title}</h2>
              <p className="hero-subtitle">
                Điểm đến: {trip.destination} · Từ {new Date(trip.startDate).toLocaleDateString('vi-VN')} đến {new Date(trip.endDate).toLocaleDateString('vi-VN')}
              </p>
              
              <div className="hero-actions">
                <button className="btn-outline" onClick={() => {
                  localStorage.setItem('currentTripId', trip.id);
                  navigate('/itinerary');
                }}>Mở chi tiết</button>
                <div className="member-avatars">
                  <div className="avatar-circle c1"></div>
                  <span className="member-count">{trip.numberOfParticipants} thành viên</span>
                  <span className="member-count" style={{marginLeft: 16}}>Ngân sách: {trip.budget.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
