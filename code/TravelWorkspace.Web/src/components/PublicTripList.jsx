import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CloneTripModal from './CloneTripModal';
import TemplatePreviewModal from './TemplatePreviewModal';
import { 
  Flame, 
  Clock, 
  MapPin, 
  Search, 
  Sparkles, 
  Compass, 
  Eye,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import './PublicTripList.css';

// Ảnh phong cảnh chuẩn xác theo danh lam thắng cảnh Việt Nam (Tuyệt đối không dùng ảnh biển cho vùng cao)
const DESTINATION_IMAGES = {
  'hà giang': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop', // Đèo Mã Pì Lèng
  'ha giang': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop',
  'sapa': 'https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop',     // Ruộng bậc thang & Núi Sapa
  'sa pa': 'https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop',
  'đà nẵng': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',  // Bà Nà Hills & Cầu Vàng
  'da nang': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
  'hội an': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  'ninh bình': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80',
  'default': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop'
};

const getDestinationImage = (destination, title, dbImageUrl) => {
  if (dbImageUrl && dbImageUrl.trim()) return dbImageUrl;
  const text = `${destination || ''} ${title || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key !== 'default' && text.includes(key)) {
      return url;
    }
  }
  return DESTINATION_IMAGES.default;
};

const PublicTripList = ({ 
  title = "Lịch Trình Mẫu Siêu Hot", 
  subtitle = "Khám phá các hành trình du lịch được cộng đồng yêu thích nhất và nhân bản ngay chỉ với 1 cú click!",
  limit = null,
  showSearch = true,
  requireAuth = false,
  onRequireAuth = null,
  tagText = "KHO TEMPLATE CỘNG ĐỒNG"
}) => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State quản lý Preview Modal
  const [selectedTripForPreview, setSelectedTripForPreview] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // State quản lý Clone Modal
  const [selectedTripForClone, setSelectedTripForClone] = useState(null);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  useEffect(() => {
    fetchPublicTrips();
  }, []);

  const fetchPublicTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips/public');
      // Đảm bảo chỉ hiển thị các chuyến đi có isPublic == true và sắp xếp theo cloneCount giảm dần
      const publicTrips = (res.data || [])
        .filter(t => t.isPublic === true)
        .sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));
      setTrips(publicTrips);
    } catch (err) {
      console.error('Lỗi khi tải lịch trình công khai:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal xem trước chi tiết
  const handleOpenPreviewModal = (trip) => {
    setSelectedTripForPreview(trip);
    setIsPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setSelectedTripForPreview(null);
  };

  // Kích hoạt clone từ Preview modal
  const handleUseTemplateFromPreview = (trip) => {
    handleClosePreviewModal();
    handleOpenCloneModal(trip);
  };

  // Mở modal cấu hình clone (có kiểm tra quyền đăng nhập nếu được yêu cầu)
  const handleOpenCloneModal = (trip) => {
    const token = localStorage.getItem('token');
    if (!token && (requireAuth || onRequireAuth)) {
      if (onRequireAuth) {
        onRequireAuth(trip);
      } else {
        navigate('/login', {
          state: {
            message: "Vui lòng đăng nhập để lưu template này vào Workspace của bạn!",
            returnTripId: trip.id
          }
        });
      }
      return;
    }

    setSelectedTripForClone(trip);
    setIsCloneModalOpen(true);
  };

  const handleCloseCloneModal = () => {
    setIsCloneModalOpen(false);
    setSelectedTripForClone(null);
  };

  const handleCloneSuccess = (newTripId) => {
    handleCloseCloneModal();
    const toastMsg = "Nhân bản thành công! Hãy bắt đầu tùy chỉnh chuyến đi của bạn";
    localStorage.setItem('cloneSuccessToast', toastMsg);
    localStorage.setItem('currentTripId', newTripId);

    // Điều hướng thẳng vào trang /itinerary/{newTripId}
    navigate(`/itinerary/${newTripId}`, {
      state: {
        cloneSuccess: true,
        message: toastMsg
      }
    });
  };

  const calculateDuration = (trip) => {
    if (!trip.startDate || !trip.endDate) return '3 ngày 2 đêm';
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ngày ${Math.max(1, diffDays - 1)} đêm`;
  };

  const filteredTrips = trips.filter(trip => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (trip.title && trip.title.toLowerCase().includes(q)) ||
      (trip.destination && trip.destination.toLowerCase().includes(q)) ||
      (trip.origin && trip.origin.toLowerCase().includes(q)) ||
      (trip.preferences && trip.preferences.toLowerCase().includes(q))
    );
  });

  const displayedTrips = limit ? filteredTrips.slice(0, limit) : filteredTrips;

  return (
    <div className="public-feed-container">
      {/* Header & Search */}
      <div className="public-feed-header">
        <div className="public-feed-title-wrap">
          <div className="public-feed-tag">
            <Sparkles size={14} />
            <span>{tagText}</span>
          </div>
          <h2 className="public-feed-title">{title}</h2>
          <p className="public-feed-desc">{subtitle}</p>
        </div>

        {showSearch && (
          <div className="public-feed-search-wrap">
            <Search size={18} className="public-feed-search-icon" />
            <input
              type="text"
              className="public-feed-search-input"
              placeholder="Tìm theo điểm đến, tên lịch trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Grid Cards */}
      <div className="public-feed-grid">
        {loading ? (
          // Shimmer loading skeletons
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="public-skeleton-card">
              <div className="public-skeleton-thumb"></div>
              <div className="public-skeleton-body">
                <div className="public-skeleton-line w-80"></div>
                <div className="public-skeleton-line w-60"></div>
                <div className="public-skeleton-line w-40"></div>
              </div>
            </div>
          ))
        ) : displayedTrips.length === 0 ? (
          <div className="public-empty-box">
            <Compass size={40} style={{ color: '#1e6b65', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '18px', color: '#122b29', marginBottom: '6px' }}>
              Không tìm thấy lịch trình phù hợp
            </h4>
            <p style={{ fontSize: '14px', color: '#6e807f' }}>
              Hãy thử tìm kiếm bằng từ khóa khác như "Hà Giang", "Đà Nẵng", "Sapa"...
            </p>
          </div>
        ) : (
          displayedTrips.map((trip) => {
            const bgImage = getDestinationImage(trip.destination, trip.title, trip.imageUrl);
            const durationText = calculateDuration(trip);
            const prefTags = trip.preferences
              ? trip.preferences.split(',').map(s => s.trim()).filter(Boolean)
              : [];

            return (
              <div key={trip.id} className="public-trip-card">
                {/* Thumbnail banner */}
                <div className="public-trip-thumb">
                  <img 
                    src={bgImage} 
                    alt={trip.title} 
                    className="public-trip-img"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80";
                    }}
                  />
                  <div className="public-trip-gradient"></div>

                  <div className="public-trip-badges-top">
                    <span className="public-hot-badge">
                      <Flame size={13} />
                      <span>HOT TEMPLATE</span>
                    </span>

                    <span className="public-clone-badge">
                      <TrendingUp size={13} />
                      <span>{trip.cloneCount || 0} đã clone</span>
                    </span>
                  </div>

                  <div className="public-trip-dest-badge">
                    <MapPin size={14} />
                    <span>{trip.destination || 'Việt Nam'}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="public-trip-content">
                  <h3 className="public-trip-title" title={trip.title}>
                    {trip.title}
                  </h3>

                  <div className="public-trip-meta-row">
                    <div className="public-trip-meta-item">
                      <Clock size={14} />
                      <span>{durationText}</span>
                    </div>
                    {trip.origin && (
                      <div className="public-trip-meta-item">
                        <span>Từ: <strong>{trip.origin}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Badge Pills cho sở thích/mô tả (tránh tràn chữ lửng lơ) */}
                  {prefTags.length > 0 && (
                    <div className="public-trip-tags-wrap">
                      {prefTags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="public-trip-tag-badge" title={tag}>
                          #{tag}
                        </span>
                      ))}
                      {prefTags.length > 3 && (
                        <span 
                          className="public-trip-tag-badge more" 
                          title={trip.preferences}
                        >
                          +{prefTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Budget row */}
                  <div className="public-trip-budget-row">
                    <span className="public-trip-budget-label">Dự trù chi phí</span>
                    <span className="public-trip-budget-value">
                      {trip.budget > 0 
                        ? `${Number(trip.budget).toLocaleString('vi-VN')} đ` 
                        : 'Tiết kiệm'}
                    </span>
                  </div>

                  {/* Card Footer: 2 Cụm nút bấm */}
                  <div className="public-trip-footer-actions">
                    <button
                      type="button"
                      className="public-trip-btn-outline"
                      onClick={() => handleOpenPreviewModal(trip)}
                      title="Xem trước toàn bộ lịch trình các ngày"
                    >
                      <Eye size={15} />
                      <span>Xem chi tiết</span>
                    </button>

                    <button
                      type="button"
                      className="public-trip-btn-primary"
                      onClick={() => handleOpenCloneModal(trip)}
                      title="Sao chép lịch trình này để lên kế hoạch"
                    >
                      <Flame size={15} />
                      <span>Sử dụng Template</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Preview Chi tiết các chặng */}
      <TemplatePreviewModal
        isOpen={isPreviewModalOpen}
        trip={selectedTripForPreview}
        onClose={handleClosePreviewModal}
        onUseTemplate={handleUseTemplateFromPreview}
      />

      {/* Modal 2: Cấu hình Clone Lịch trình */}
      <CloneTripModal
        isOpen={isCloneModalOpen}
        trip={selectedTripForClone}
        onClose={handleCloseCloneModal}
        onCloneSuccess={handleCloneSuccess}
      />
    </div>
  );
};

export default PublicTripList;
