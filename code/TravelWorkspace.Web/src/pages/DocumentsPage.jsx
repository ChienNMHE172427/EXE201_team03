import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import './DocumentsPage.css';

const StatusSelect = ({ initialStatus, itemId, onStatusChange }) => {
  const defaultVal = initialStatus || 'Chưa bắt đầu';
  const [status, setStatus] = useState(defaultVal);
  
  const getStyle = () => {
    if (status === 'Chưa bắt đầu') return { color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5' };
    if (status === 'Đã hoàn thành') return { color: '#1e40af', background: '#eff6ff', border: '1px solid #93c5fd' };
    if (status === 'Đã chuẩn bị') return { color: '#1E429F', background: '#E1EFFE', border: '1px solid #93c5fd' };
    return { color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5' };
  };

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    onStatusChange(itemId, newStatus);
  };

  return (
    <select 
      value={status} 
      onChange={handleChange}
      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', ...getStyle() }}
    >
      <option value="Chưa bắt đầu">Chưa bắt đầu</option>
      <option value="Đã chuẩn bị">Đã chuẩn bị</option>
      <option value="Đã hoàn thành">Đã hoàn thành</option>
    </select>
  );
};

const DocumentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedInfoItem, setSelectedInfoItem] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);
        
        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          handleSelectTrip(parseInt(tripIdFromUrl));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const handleSelectTrip = async (tripId) => {
    setLoading(true);
    try {
      const res = await api.get(`/Trip/${tripId}`);
      setSelectedTrip(res.data);
      const itemsRes = await api.get(`/Itinerary/${tripId}`);
      setItems(itemsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedTrip(null);
    setItems([]);
  };

  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const itemToUpdate = items.find(i => i.id === itemId);
      if(!itemToUpdate) return;
      const updated = { ...itemToUpdate, status: newStatus };
      await api.put(`/Itinerary/${itemId}`, updated);
      setItems(items.map(i => i.id === itemId ? updated : i));
    } catch (err) {
      console.error(err);
    }
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
  const savedItems = items.filter(i => i.status && i.status !== 'Chưa bắt đầu');
  const groupedItems = savedItems.reduce((acc, item) => {
    const dateStr = new Date(item.startTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {selectedTrip.title}
        </button>
      </div>

      <div className="wizard-steps-container">
        <div className="wizard-steps">
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/itinerary?tripId=${selectedTrip.id}`)}>
            <div className="step-circle">1</div>
            <div className="step-info">
              <div className="step-title">Lịch trình</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/explore?tripId=${selectedTrip.id}`)}>
            <div className="step-circle">2</div>
            <div className="step-info">
              <div className="step-title">Khám phá & Dịch vụ</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/budget?tripId=${selectedTrip.id}`)}>
            <div className="step-circle">3</div>
            <div className="step-info">
              <div className="step-title">Chi phí nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/collaborate?tripId=${selectedTrip.id}`)}>
            <div className="step-circle">4</div>
            <div className="step-info">
              <div className="step-title">Cộng tác nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step active">
            <div className="step-circle">5</div>
            <div className="step-info">
              <div className="step-title">Trạng thái</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Trạng thái: {selectedTrip.title}</h1>
          <p className="page-subtitle">Theo dõi trạng thái hoàn thành của từng chặng trong lịch trình.</p>
        </div>
        <button className="btn-primary">+ Thêm dịch vụ</button>
      </div>
      
      <div className="services-timeline" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.keys(groupedItems).length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Chưa có hoạt động nào trong lịch trình.</p>
        ) : (
          Object.entries(groupedItems).map(([date, dayItems], index) => (
            <div key={date} className="day-group" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                Ngày {date}
              </h2>
              <div className="services-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {dayItems.map((svc, i) => (
                  <div key={svc.id} className="service-item" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
                    <div className="svc-time" style={{ fontWeight: '600', color: 'var(--color-text)', minWidth: '60px', marginTop: '2px' }}>
                      {new Date(svc.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="svc-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', marginTop: '6px' }}></div>
                    <div className="svc-details" style={{ flex: 1, paddingRight: '120px' }}>
                      <div className="svc-title" style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
                        {svc.title}
                      </div>
                      <div className="svc-provider" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        {svc.location}
                      </div>
                    </div>
                      <div className="svc-actions" style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '50%', minWidth: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}
                          onClick={() => {
                            setSelectedInfoItem(svc);
                          }}
                          title="Xem thông tin chi tiết"
                        >
                          i
                        </button>
                        <StatusSelect initialStatus={svc.status} itemId={svc.id} onStatusChange={updateItemStatus} />
                        <button className="edit-btn" onClick={() => navigate(`/explore?tripId=${selectedTrip.id}`)} title="Chỉnh sửa chặng" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {selectedInfoItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{maxWidth: 400, padding: '32px', borderRadius: '24px', background: '#fff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--color-primary-dark)' }}>Thông tin chi tiết</h2>
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <p style={{ marginBottom: '8px' }}><strong>Tên hoạt động/Dịch vụ:</strong> <br/>{selectedInfoItem.title}</p>
              <p style={{ marginBottom: '8px' }}><strong>Địa điểm/Chi tiết:</strong> <br/>{selectedInfoItem.location}</p>
              {selectedInfoItem.transport && <p style={{ marginBottom: '8px' }}><strong>Di chuyển:</strong> <br/>{selectedInfoItem.transport}</p>}
              {selectedInfoItem.notes && <p style={{ marginBottom: '8px' }}><strong>Ghi chú:</strong> <br/>{selectedInfoItem.notes}</p>}
            </div>
            <button className="btn-primary" onClick={() => setSelectedInfoItem(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
