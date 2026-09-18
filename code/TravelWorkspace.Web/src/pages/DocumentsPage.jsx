import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import './DocumentsPage.css';

const StatusSelect = ({ initialStatus }) => {
  // Map any old 'Đã xác nhận' to 'Đã hoàn thành'
  const defaultVal = initialStatus === 'Đã xác nhận' ? 'Đã hoàn thành' : initialStatus;
  const [status, setStatus] = useState(defaultVal);
  
  const getStyle = () => {
    if (status === 'Chưa bắt đầu') return { color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5' };
    if (status === 'Đã hoàn thành') return { color: '#1e40af', background: '#eff6ff', border: '1px solid #93c5fd' };
    return {};
  };

  return (
    <select 
      value={status} 
      onChange={(e) => setStatus(e.target.value)}
      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', ...getStyle() }}
    >
      <option value="Chưa bắt đầu">Chưa bắt đầu</option>
      <option value="Đã hoàn thành">Đã hoàn thành</option>
    </select>
  );
};

const DocumentsPage = () => {
  const navigate = useNavigate();
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

  const handleSelectTrip = async (tripId) => {
    setLoading(true);
    try {
      const res = await api.get(`/Trip/${tripId}`);
      setSelectedTrip(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedTrip(null);
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  // VIEW 1: DANH SÁCH CÁC PLAN (TRIP)
  if (!selectedTrip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Trạng thái</h1>
            <p className="page-subtitle">Kiểm tra trạng thái các chặng và dịch vụ trong chuyến đi.</p>
          </div>
        </div>
        
        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có kế hoạch chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div key={t.id} onClick={() => handleSelectTrip(t.id)} style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                <div style={{ height: '140px', background: 'linear-gradient(135deg, #a8e063, #56ab2f)' }}></div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#56ab2f', textTransform: 'uppercase', marginBottom: '8px' }}>Chuyến đi</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{display: 'flex', alignItems: 'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Điểm đến: {t.destination}</span>
                    <span style={{display: 'flex', alignItems: 'center', marginTop: 4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg> Khởi hành: {new Date(t.startDate).toLocaleDateString('vi-VN')}</span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#56ab2f', fontSize: '14px' }}>
                    + Mở danh sách dịch vụ
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: CHI TIẾT TIMELINE DỊCH VỤ CỦA PLAN ĐÃ CHỌN
  const startDate = new Date(selectedTrip.startDate);
  const day1 = startDate.toLocaleDateString('vi-VN');
  
  const day2Date = new Date(startDate);
  day2Date.setDate(day2Date.getDate() + 1);
  const day2 = day2Date.toLocaleDateString('vi-VN');

  const servicesByDay = [
    {
      date: day1,
      services: [
        { type: 'Di chuyển', desc: `Từ Hà Nội đến ${selectedTrip.destination}`, provider: 'Nhà xe Limousine Vip', time: '07:30', status: 'Chưa bắt đầu' },
        { type: 'Ăn uống', desc: 'Ăn trưa đặc sản địa phương', provider: 'Nhà hàng sinh thái', time: '12:00', status: 'Đã hoàn thành' },
        { type: 'Lưu trú', desc: 'Nhận phòng', provider: 'Khách sạn trung tâm', time: '14:00', status: 'Đã xác nhận' }
      ]
    },
    {
      date: day2,
      services: [
        { type: 'Tham quan', desc: 'Tour tham quan di tích nổi tiếng', provider: 'Ban quản lý khu du lịch', time: '08:00', status: 'Chưa bắt đầu' },
        { type: 'Ăn uống', desc: 'Ăn tối tiệc nướng BBQ', provider: 'Nhà hàng nướng BBQ ngoài trời', time: '19:00', status: 'Chưa bắt đầu' }
      ]
    }
  ];

  const getIcon = (type) => {
    if (type.includes('Di chuyển')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8, color: 'var(--color-primary)'}}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v9c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>;
    if (type.includes('Ăn uống')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8, color: '#f59e0b'}}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>;
    if (type.includes('Lưu trú')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8, color: '#3b82f6'}}><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>;
    if (type.includes('Tham quan')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8, color: '#10b981'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
    return null;
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Plans
        </button>
      </div>
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Trạng thái: {selectedTrip.title}</h1>
          <p className="page-subtitle">Theo dõi trạng thái hoàn thành của từng chặng trong lịch trình.</p>
        </div>
        <button className="btn-primary">+ Thêm dịch vụ</button>
      </div>
      
      <div className="services-timeline" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {servicesByDay.map((day, index) => (
          <div key={index} className="day-group" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              Ngày {day.date}
            </h2>
            <div className="services-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {day.services.map((svc, i) => (
                <div key={i} className="service-item" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
                  <div className="svc-time" style={{ fontWeight: '600', color: 'var(--color-text)', minWidth: '60px', marginTop: '2px' }}>
                    {svc.time}
                  </div>
                  <div className="svc-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', marginTop: '6px' }}></div>
                  <div className="svc-details" style={{ flex: 1, paddingRight: '120px' }}>
                    <div className="svc-title" style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
                      {getIcon(svc.type)}
                      {svc.type}: {svc.desc}
                    </div>
                    <div className="svc-provider" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {svc.provider}
                    </div>
                  </div>
                  <div className="svc-actions" style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusSelect initialStatus={svc.status} />
                    <button className="edit-btn" onClick={() => navigate(`/explore?tripId=${selectedTrip.id}&category=${encodeURIComponent(svc.type)}`)} title="Chỉnh sửa chặng">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsPage;
