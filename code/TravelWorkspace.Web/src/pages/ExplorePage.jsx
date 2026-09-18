import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ExplorePage.css';
import MOCK_SERVICES from '../servicesData.json';

const ExplorePage = () => {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State tìm kiếm Plan
  const [searchPlanQuery, setSearchPlanQuery] = useState("");
  
  // State tìm kiếm và lọc Dịch vụ
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  
  // State modal thông báo
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [targetItemId, setTargetItemId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        const loadedTrips = res.data;
        setTrips(loadedTrips);

        // Đọc tham số từ URL
        const params = new URLSearchParams(location.search);
        const tripIdParam = params.get('tripId');
        const categoryParam = params.get('category');
        const searchParam = params.get('search');
        const itemIdParam = params.get('itemId');

        if (itemIdParam) {
          setTargetItemId(itemIdParam);
        }

        if (searchParam) {
          setSearchLocationQuery(searchParam);
        }

        if (tripIdParam) {
          const matchedTrip = loadedTrips.find(t => t.id.toString() === tripIdParam);
          if (matchedTrip) {
            setSelectedTrip(matchedTrip);
            if (categoryParam) {
              setActiveCategory(categoryParam);
            }
            if (!searchParam) {
              setSearchLocationQuery(matchedTrip.destination);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
  };

  const handleBack = () => {
    setSelectedTrip(null);
    setSearchLocationQuery("");
    setActiveCategory("Tất cả");
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  // VIEW 1: DANH SÁCH LỊCH TRÌNH (PLANS)
  if (!selectedTrip) {
    const filteredTrips = trips.filter(t => 
      t.title.toLowerCase().includes(searchPlanQuery.toLowerCase()) || 
      t.destination.toLowerCase().includes(searchPlanQuery.toLowerCase())
    );

    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Khám phá & Đặt dịch vụ</h1>
            <p className="page-subtitle">Chọn một lịch trình để bắt đầu tìm kiếm dịch vụ tương ứng.</p>
          </div>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Tìm kiếm lịch trình..." 
              className="search-input" 
              value={searchPlanQuery}
              onChange={(e) => setSearchPlanQuery(e.target.value)}
            />
            <button className="btn-primary">Tìm kiếm</button>
          </div>
        </div>
        
        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {filteredTrips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Không tìm thấy lịch trình nào.</p>
          ) : (
            filteredTrips.map(t => (
              <div key={t.id} onClick={() => handleSelectTrip(t)} style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}></div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Lịch trình</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{display: 'flex', alignItems: 'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Điểm đến: {t.destination}</span>
                    <span style={{display: 'flex', alignItems: 'center', marginTop: 4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg> Khởi hành: {new Date(t.startDate).toLocaleDateString('vi-VN')}</span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: 'var(--color-primary)', fontSize: '14px' }}>
                    + Mở tìm kiếm dịch vụ
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: CHI TIẾT DỊCH VỤ CỦA PLAN ĐÃ CHỌN
  const categories = ["Tất cả", "Lưu trú", "Ăn uống", "Tham quan", "Di chuyển"];

  // Logic lọc dịch vụ
  const filteredServices = MOCK_SERVICES.filter(svc => {
    // Lọc theo Category
    const matchCategory = activeCategory === "Tất cả" || svc.category === activeCategory;
    // Lọc theo Search Query (tìm trong title hoặc desc)
    const q = searchLocationQuery.toLowerCase();
    const matchSearch = svc.title.toLowerCase().includes(q) || svc.desc.toLowerCase().includes(q);
    
    return matchCategory && matchSearch;
  });

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
          <div className="step active">
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
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents?tripId=${selectedTrip.id}`)}>
            <div className="step-circle">5</div>
            <div className="step-info">
              <div className="step-title">Trạng thái</div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Dịch vụ tại {selectedTrip.destination}</h1>
          <p className="page-subtitle">Khám phá cho lịch trình: {selectedTrip.title}</p>
        </div>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder={`Tìm kiếm theo địa điểm (VD: Cố đô Hoa Lư)...`} 
            className="search-input" 
            value={searchLocationQuery}
            onChange={(e) => setSearchLocationQuery(e.target.value)}
            style={{ width: '320px' }}
          />
          <button className="btn-primary">Tìm kiếm</button>
        </div>
      </div>

      <div className="category-tabs">
        {categories.map(cat => (
          <div 
            key={cat}
            className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </div>
        ))}
      </div>

      <h2 className="section-title mt-8">
        {searchLocationQuery ? `Đề xuất tại khu vực "${searchLocationQuery}"` : "Đề xuất cho nhóm bạn"}
      </h2>
      
      <div className="explore-grid">
        {filteredServices.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}>Không tìm thấy dịch vụ nào phù hợp với tìm kiếm của bạn.</p>
        ) : (
          filteredServices.map(svc => (
            <div key={svc.id} className="explore-card">
              <div className={`card-image ${svc.imgClass}`}>
                {svc.badge && <div className="badge-overlay">{svc.badge}</div>}
              </div>
              <div className="card-content">
                <div className="card-type">{svc.type}</div>
                <h3 className="card-title">{svc.title}</h3>
                <div className="card-meta">
                  <span className="rating">★ {svc.rating}</span>
                  <span className="reviews">({svc.reviews} đánh giá)</span>
                  <span className="price">{svc.price}</span>
                </div>
                <p className="card-desc">{svc.desc}</p>
                <button 
                  className="btn-outline w-full"
                  onClick={async () => {
                    if (!selectedTrip) return;
                    try {
                      if (targetItemId) {
                        const tripRes = await api.get(`/Itinerary/${selectedTrip.id}`);
                        const itemToUpdate = tripRes.data.find(i => i.id.toString() === targetItemId);
                        if (itemToUpdate) {
                          if (svc.category === 'Di chuyển') {
                            itemToUpdate.transport = svc.title;
                          } else {
                            itemToUpdate.destination = svc.title;
                            itemToUpdate.notes = (itemToUpdate.notes ? itemToUpdate.notes + '\n' : '') + `${svc.category}: ${svc.title}`;
                          }
                          await api.put(`/Itinerary/${targetItemId}`, itemToUpdate);
                        }
                      } else {
                        const today = new Date();
                        today.setHours(12, 0, 0, 0);
                        const newItem = {
                          title: svc.title,
                          location: selectedTrip.destination,
                          destination: svc.title,
                          notes: `Dịch vụ: ${svc.type}\n${svc.desc}`,
                          startTime: today.toISOString(),
                          endTime: today.toISOString(),
                          transport: 'Vui lòng chọn dịch vụ',
                          assignee: '',
                          status: 'Chưa bắt đầu'
                        };
                        await api.post(`/Itinerary/${selectedTrip.id}`, newItem);
                      }
                      setShowSuccessModal(true);
                    } catch (err) {
                      console.error(err);
                      alert('Có lỗi xảy ra khi thêm vào lịch trình.');
                    }
                  }}
                >
                  + Thêm vào lịch
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showSuccessModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px', color: '#10b981' }}>✅</div>
            <h2 style={{ marginBottom: '12px', color: 'var(--color-text)', fontSize: '24px' }}>Thêm thành công!</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '15px' }}>Dịch vụ này đã được thêm vào lịch trình của bạn.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShowSuccessModal(false)} style={{ flex: 1 }}>
                Đóng
              </button>
              <button className="btn-primary" onClick={() => navigate(`/itinerary?tripId=${selectedTrip.id}`)} style={{ flex: 1 }}>
                Xem lịch trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
