import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ExplorePage.css';

// Dữ liệu giả lập các dịch vụ (Mock Data)
const MOCK_SERVICES = [
  { id: 1, type: 'NHÀ HÀNG', category: 'Ăn uống', title: 'Nhà hàng Ba Cửa', rating: 4.8, reviews: 124, price: '$$', desc: 'Đặc sản thịt dê núi Ninh Bình ngon nức tiếng, không gian rộng rãi. Gần Tràng An.', badge: 'Phù hợp nhóm', imgClass: 'i1' },
  { id: 2, type: 'THAM QUAN', category: 'Tham quan', title: 'Tuyệt Tình Cốc', rating: 4.9, reviews: 342, price: '$', desc: 'Hồ nước trong xanh tuyệt đẹp bao quanh bởi núi đá vôi hùng vĩ. Gần Cố đô Hoa Lư.', badge: null, imgClass: 'i2' },
  { id: 3, type: 'LƯU TRÚ', category: 'Lưu trú', title: 'Emeralda Resort', rating: 4.7, reviews: 89, price: '$$$', desc: 'Resort phong cách làng quê Bắc Bộ tĩnh lặng và cao cấp.', badge: 'Đang giảm 15%', imgClass: 'i3' },
  { id: 4, type: 'DI CHUYỂN', category: 'Di chuyển', title: 'Limousine Tràng An', rating: 4.5, reviews: 56, price: '$$', desc: 'Đưa đón tận nơi tại các điểm tham quan chính ở Ninh Bình và Cố đô Hoa Lư.', badge: null, imgClass: 'i1' },
  { id: 5, type: 'THAM QUAN', category: 'Tham quan', title: 'Cố đô Hoa Lư', rating: 4.6, reviews: 512, price: '$', desc: 'Khu di tích lịch sử quốc gia đặc biệt, kinh đô đầu tiên của nhà nước phong kiến tập quyền.', badge: 'Di tích lịch sử', imgClass: 'i2' }
];

const ExplorePage = () => {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State tìm kiếm Plan
  const [searchPlanQuery, setSearchPlanQuery] = useState("");
  
  // State tìm kiếm và lọc Dịch vụ
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");

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
                    📍 Điểm đến: {t.destination} <br/>
                    📅 Khởi hành: {new Date(t.startDate).toLocaleDateString('vi-VN')}
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
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Lịch trình
        </button>
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
                <button className="btn-outline w-full">+ Thêm vào lịch</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
