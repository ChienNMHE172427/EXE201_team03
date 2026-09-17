import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DocumentsPage = () => {
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
            <h1 className="page-title">Tài liệu & Dịch vụ</h1>
            <p className="page-subtitle">Chọn một kế hoạch chuyến đi (Plan) để xem chi tiết các dịch vụ đã chốt.</p>
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
                    📍 Điểm đến: {t.destination} <br/>
                    📅 Khởi hành: {new Date(t.startDate).toLocaleDateString('vi-VN')}
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
        { type: '🚐 Di chuyển', desc: `Từ Hà Nội đến ${selectedTrip.destination}`, provider: 'Nhà xe Limousine Vip', time: '07:30' },
        { type: '🍽️ Ăn uống', desc: 'Ăn trưa đặc sản địa phương', provider: 'Nhà hàng sinh thái', time: '12:00' },
        { type: '🏨 Lưu trú', desc: 'Nhận phòng', provider: 'Khách sạn trung tâm', time: '14:00' }
      ]
    },
    {
      date: day2,
      services: [
        { type: '🎟️ Tham quan', desc: 'Tour tham quan di tích nổi tiếng', provider: 'Ban quản lý khu du lịch', time: '08:00' },
        { type: '🍽️ Ăn uống', desc: 'Ăn tối tiệc nướng BBQ', provider: 'Nhà hàng nướng BBQ ngoài trời', time: '19:00' }
      ]
    }
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Plans
        </button>
      </div>
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Dịch vụ đã chốt: {selectedTrip.title}</h1>
          <p className="page-subtitle">Danh sách vé xe, phòng nghỉ và các dịch vụ đã được xác nhận theo lịch trình.</p>
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
                <div key={i} className="service-item" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div className="svc-time" style={{ fontWeight: '600', color: 'var(--color-text)', minWidth: '60px', marginTop: '2px' }}>
                    {svc.time}
                  </div>
                  <div className="svc-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', marginTop: '6px' }}></div>
                  <div className="svc-details" style={{ flex: 1 }}>
                    <div className="svc-title" style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px', color: 'var(--color-text)' }}>
                      {svc.type}: {svc.desc}
                    </div>
                    <div className="svc-provider" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {svc.provider}
                    </div>
                  </div>
                  <div className="svc-status" style={{ fontSize: '12px', background: '#e0f7fa', color: '#00838f', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    Đã xác nhận
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
