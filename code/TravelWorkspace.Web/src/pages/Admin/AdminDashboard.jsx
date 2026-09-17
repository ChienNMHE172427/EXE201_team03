import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalTrips: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        setStats(res.data);
        setLoading(false);
      } catch (err) {
        setError('Không thể lấy thống kê hệ thống.');
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="admin-page">Đang tải dữ liệu...</div>;
  if (error) return <div className="admin-page error">{error}</div>;

  return (
    <div className="admin-page">
      <h2>Tổng quan hệ thống</h2>
      <div className="admin-stats-grid">
        <div className="stat-card">
          <h3>Tổng số người dùng</h3>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-trend positive">Được lấy từ Database</div>
        </div>
        <div className="stat-card">
          <h3>Số chuyến đi đã tạo</h3>
          <div className="stat-value">{stats.totalTrips}</div>
          <div className="stat-trend positive">Được lấy từ Database</div>
        </div>
        <div className="stat-card">
          <h3>Dịch vụ chờ duyệt</h3>
          <div className="stat-value" style={{color: '#ff6b6b'}}>0</div>
          <div className="stat-trend">Chưa ra mắt</div>
        </div>
        <div className="stat-card">
          <h3>Tổng chi tiêu ghi nhận</h3>
          <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
          <div className="stat-trend positive">Doanh thu dự kiến</div>
        </div>
      </div>

      <h3 style={{marginTop: '40px', marginBottom: '20px'}}>Hoạt động gần đây</h3>
      <div className="admin-recent-activity">
        <div className="activity-item">
          <div className="activity-icon bg-blue">👤</div>
          <div className="activity-details">
            <div className="activity-title">Hệ thống đang hoạt động ổn định</div>
            <div className="activity-time">Vừa xong</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
