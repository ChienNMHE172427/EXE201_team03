import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, MapPin, MessageSquare, ExternalLink, Check, Plus, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import ReviewSection from './ReviewSection';
import MOCK_SERVICES from '../servicesData.json';
import hotelLinks from '../hotelLinks.json';
import './ExploreServiceDrawer.css';

/**
 * ExploreServiceDrawer
 * Slide-out drawer embedded directly within ItineraryPage.
 * Automatically filters services/places matching the clicked activity context.
 */
const ExploreServiceDrawer = ({
  isOpen,
  onClose,
  activityContext,
  trip,
  onActivityUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedReviewPlace, setSelectedReviewPlace] = useState(null);
  const [addingServiceId, setAddingServiceId] = useState(null);
  const [addedSuccessIds, setAddedSuccessIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  const categories = ['Tất cả', 'Lưu trú', 'Ăn uống', 'Tham quan', 'Di chuyển'];

  // Initialize or reset filters whenever drawer opens or activityContext changes
  useEffect(() => {
    if (isOpen && activityContext) {
      // Automatic Context-Aware Default Keyword
      const defaultKeyword = activityContext.location
        ? getShortLocation(activityContext.location)
        : (activityContext.title ? formatItemTitle(activityContext.title) : '');
      
      setSearchQuery(defaultKeyword);

      if (activityContext.defaultCategory && categories.includes(activityContext.defaultCategory)) {
        setActiveCategory(activityContext.defaultCategory);
      } else {
        setActiveCategory('Tất cả');
      }

      setAddedSuccessIds(new Set());
    }
  }, [isOpen, activityContext]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedReviewPlace) {
          setSelectedReviewPlace(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedReviewPlace, onClose]);

  // Context-Aware Filter Logic
  const filteredServices = useMemo(() => {
    const normalize = (str) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const q = searchQuery.trim();
    const qNorm = normalize(q);

    return MOCK_SERVICES.filter((svc) => {
      // 1. Filter by Category
      const matchCategory = activeCategory === 'Tất cả' || svc.category === activeCategory;
      if (!matchCategory) return false;

      // 2. Filter by search query
      if (!qNorm) return true;

      const titleNorm = normalize(svc.title);
      const descNorm = normalize(svc.desc);
      const typeNorm = normalize(svc.type);

      // Direct substring match
      if (titleNorm.includes(qNorm) || descNorm.includes(qNorm) || typeNorm.includes(qNorm)) {
        return true;
      }

      // Keyword token match (supports multi-word phrases)
      const tokens = qNorm.split(/\s+/).filter((t) => t.length > 2);
      if (tokens.length > 0 && tokens.some((t) => titleNorm.includes(t) || descNorm.includes(t))) {
        return true;
      }

      return false;
    });
  }, [searchQuery, activeCategory]);

  // Get affiliate / booking links
  const getTravelokaLink = (svc) => {
    if (!hotelLinks) return 'https://www.traveloka.com';
    return hotelLinks[svc.title] || 'https://www.traveloka.com';
  };

  const getAgodaLink = (svc) => {
    const baseDate = trip?.startDate ? new Date(trip.startDate) : new Date();
    const ci = baseDate.toISOString().split('T')[0];
    const coDate = new Date(baseDate);
    coDate.setDate(coDate.getDate() + 1);
    const co = trip?.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : coDate.toISOString().split('T')[0];
    return `https://www.agoda.com/search?textToSearch=${encodeURIComponent(svc.title)}&checkIn=${ci}&checkOut=${co}`;
  };

  const getBookingLink = (svc) => {
    const baseDate = trip?.startDate ? new Date(trip.startDate) : new Date();
    const ci = baseDate.toISOString().split('T')[0];
    const coDate = new Date(baseDate);
    coDate.setDate(coDate.getDate() + 1);
    const co = trip?.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : coDate.toISOString().split('T')[0];
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(svc.title)}&checkin=${ci}&checkout=${co}`;
  };

  // Add service directly to selected activity stage
  const handleAddServiceToStage = async (svc) => {
    if (!activityContext) return;
    setAddingServiceId(svc.id);

    try {
      const tripId = trip?.id || activityContext.tripId;
      if (tripId && activityContext.id) {
        // Fetch current itinerary to ensure atomic update
        const tripRes = await api.get(`/Itinerary/${tripId}`);
        const currentItem = tripRes.data.find((i) => i.id === activityContext.id);

        if (currentItem) {
          if (svc.category === 'Di chuyển') {
            currentItem.transport = svc.title;
          } else {
            currentItem.destination = svc.title;
            const newNote = `${svc.category}: ${svc.title}`;
            currentItem.notes = currentItem.notes ? `${currentItem.notes}\n${newNote}` : newNote;
          }

          await api.put(`/Itinerary/${activityContext.id}`, currentItem);
        }
      }

      setAddedSuccessIds((prev) => new Set([...prev, svc.id]));
      setToastMessage(`Đã thêm "${svc.title}" vào chặng!`);
      setTimeout(() => setToastMessage(null), 3000);

      if (onActivityUpdated) {
        onActivityUpdated();
      }
    } catch (err) {
      console.error('Error adding service to activity stage:', err);
      alert('Có lỗi xảy ra khi thêm dịch vụ vào chặng lịch trình.');
    } finally {
      setAddingServiceId(null);
    }
  };

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <aside
        className={`drawer-panel ${isOpen ? 'open' : ''}`}
        aria-label="Khám phá dịch vụ lịch trình"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-badge">
              <MapPin size={12} /> Khám phá & Dịch vụ
            </span>
            <h3 className="drawer-title">Gợi ý dịch vụ tại chặng</h3>
            {activityContext && (
              <div className="drawer-subtitle" title={activityContext.location || activityContext.title}>
                <span>Chặng:</span>
                <strong style={{ color: '#0f172a' }}>
                  {formatItemTitle(activityContext.title)}
                </strong>
                {activityContext.location && (
                  <span>({getShortLocation(activityContext.location)})</span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="drawer-filter-bar">
          <div className="drawer-search-box">
            <Search size={16} className="drawer-search-icon" />
            <input
              type="text"
              className="drawer-search-input"
              placeholder="Tìm theo tên dịch vụ hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="drawer-clear-search"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="drawer-category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`drawer-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Toast notification */}
        {toastMessage && (
          <div
            style={{
              padding: '10px 16px',
              background: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Check size={16} color="#059669" />
            {toastMessage}
          </div>
        )}

        {/* Services List Content */}
        <div className="drawer-content">
          <div className="drawer-services-summary">
            <span>
              {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Tất cả gợi ý'}
            </span>
            <span>{filteredServices.length} dịch vụ</span>
          </div>

          {filteredServices.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="drawer-empty-icon">🔍</div>
              <h4 className="drawer-empty-title">Không tìm thấy dịch vụ phù hợp</h4>
              <p className="drawer-empty-desc">
                Không có dịch vụ nào khớp với từ khóa "{searchQuery}". Bạn có thể xóa từ khóa để xem toàn bộ dịch vụ.
              </p>
              <button
                type="button"
                className="drawer-empty-btn"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('Tất cả');
                }}
              >
                Xem tất cả dịch vụ
              </button>
            </div>
          ) : (
            filteredServices.map((svc) => {
              const isAdded = addedSuccessIds.has(svc.id);
              const isBusy = addingServiceId === svc.id;

              return (
                <article key={svc.id} className="drawer-card">
                  <div className={`drawer-card-media ${svc.imgClass || 'i1'}`}>
                    {svc.badge && (
                      <span className="drawer-card-badge">{svc.badge}</span>
                    )}
                  </div>

                  <div className="drawer-card-body">
                    <div className="drawer-card-top">
                      <span className="drawer-card-type">{svc.type}</span>
                      <span className="drawer-price">
                        {svc.category === 'Lưu trú' ? 'Xem giá web' : ''}
                      </span>
                    </div>

                    <h4 className="drawer-card-title">{svc.title}</h4>

                    <div className="drawer-card-meta">
                      <span className="drawer-rating">★ {svc.rating}</span>
                      <span className="drawer-reviews">({svc.reviews} đánh giá)</span>
                    </div>

                    <p className="drawer-card-desc">{svc.desc}</p>

                    <div className="drawer-card-actions">
                      {/* Nút thêm vào chặng */}
                      <button
                        type="button"
                        className={`btn-add-to-stage ${isAdded ? 'added' : ''}`}
                        onClick={() => handleAddServiceToStage(svc)}
                        disabled={isBusy || isAdded}
                      >
                        {isAdded ? (
                          <>
                            <Check size={15} /> Đã thêm vào chặng
                          </>
                        ) : isBusy ? (
                          'Đang lưu...'
                        ) : (
                          <>
                            <Plus size={15} /> Thêm vào chặng này
                          </>
                        )}
                      </button>

                      {/* Nút xem review cộng đồng */}
                      <button
                        type="button"
                        className="btn-drawer-review"
                        onClick={() =>
                          setSelectedReviewPlace({
                            id: svc.title,
                            name: svc.title,
                            category: svc.category,
                            desc: svc.desc
                          })
                        }
                      >
                        <MessageSquare size={14} /> Mẹo & Đánh giá cộng đồng
                      </button>

                      {/* Các link liên kết đối tác / OTA cho khách sạn */}
                      {svc.category === 'Lưu trú' && (
                        <div className="drawer-hotel-links">
                          <a
                            href={getTravelokaLink(svc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="drawer-hotel-link traveloka"
                            title="Đặt qua Traveloka"
                          >
                            Traveloka <ExternalLink size={11} style={{ marginLeft: 3 }} />
                          </a>
                          <a
                            href={getAgodaLink(svc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="drawer-hotel-link agoda"
                            title="Đặt qua Agoda"
                          >
                            Agoda <ExternalLink size={11} style={{ marginLeft: 3 }} />
                          </a>
                          <a
                            href={getBookingLink(svc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="drawer-hotel-link booking"
                            title="Đặt qua Booking.com"
                          >
                            Booking <ExternalLink size={11} style={{ marginLeft: 3 }} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>

      {/* Review Modal if clicked */}
      {selectedReviewPlace && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
          onClick={() => setSelectedReviewPlace(null)}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedReviewPlace(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <ReviewSection
              placeId={selectedReviewPlace.id}
              placeName={selectedReviewPlace.name}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ExploreServiceDrawer;
