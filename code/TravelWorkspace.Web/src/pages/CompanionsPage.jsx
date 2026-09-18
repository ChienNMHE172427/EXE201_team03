import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CompanionsPage = () => {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
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

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
  };

  const handleBack = () => {
    setSelectedTrip(null);
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  // VIEW 1: DANH SÁCH LỊCH TRÌNH
  if (!selectedTrip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quản lý Bạn đồng hành</h1>
            <p className="page-subtitle">Chọn một lịch trình để xem và quản lý thành viên tham gia.</p>
          </div>
        </div>
        
        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div key={t.id} onClick={() => handleSelectTrip(t)} style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #FF9A9E, #FECFEF)' }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{display: 'flex', alignItems: 'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Nhóm: {t.numberOfParticipants || 1} người</span>
                    <span style={{display: 'flex', alignItems: 'center', marginTop: 4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Điểm đến: {t.destination}</span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#ff7b89', fontSize: '14px' }}>
                    + Mở danh sách thành viên
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: CHI TIẾT THÀNH VIÊN
  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Lịch trình
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Nhóm đi {selectedTrip.title}</h1>
          <p className="page-subtitle">Quản lý {selectedTrip.numberOfParticipants || 1} thành viên và quyền truy cập vào chuyến đi này.</p>
        </div>
        <button className="btn-primary" onClick={async () => {
          const email = window.prompt("Nhập địa chỉ Email của người bạn muốn mời vào nhóm:");
          if (!email) return;
          
          try {
            await api.post(`/Trip/${selectedTrip.id}/invite`, {
              email: email,
              role: "Thành viên"
            });
            alert("Đã thêm thành viên thành công!");
          } catch (err) {
            alert("Không thể thêm thành viên. Vui lòng kiểm tra lại Email (người này phải có tài khoản trong hệ thống) hoặc bạn không phải là Chủ phòng.");
          }
        }}>+ Mời thành viên</button>
      </div>
      
      <div className="timeline-section mt-8" style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #eee'}}>
          <div className="avatar-circle c1" style={{width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: '#e0f2fe', color: '#0369a1', borderRadius: '50%', fontSize: '18px'}}>
            MT
          </div>
          <div>
            <h3 style={{fontSize: 16, fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px'}}>Minh Triết (Bạn)</h3>
            <span style={{ fontSize: 12, background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>Quản trị viên (Host)</span>
          </div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24}}>
          <div className="avatar-circle c2" style={{width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: '#fce7f3', color: '#be185d', borderRadius: '50%', fontSize: '18px'}}>
            LA
          </div>
          <div>
            <h3 style={{fontSize: 16, fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px'}}>Lan Anh</h3>
            <span style={{ fontSize: 12, background: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>Thành viên</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanionsPage;
