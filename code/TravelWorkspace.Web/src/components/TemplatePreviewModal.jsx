import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  X, 
  Flame, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Calendar, 
  Car, 
  DollarSign, 
  Sparkles, 
  Compass, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import './TemplatePreviewModal.css';

const TemplatePreviewModal = ({ isOpen, trip, onClose, onUseTemplate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !trip) {
      setItems([]);
      return;
    }

    // Nếu trip đã có sẵn ItineraryItems từ API public
    if (trip.itineraryItems && trip.itineraryItems.length > 0) {
      setItems(trip.itineraryItems);
    } else {
      // Fetch fallback từ /api/itinerary/{trip.id}
      fetchItinerary(trip.id);
    }
  }, [isOpen, trip]);

  const fetchItinerary = async (tripId) => {
    try {
      setLoading(true);
      const res = await api.get(`/itinerary/${tripId}`);
      setItems(res.data || []);
    } catch (err) {
      console.warn('Không thể tải chi tiết chặng, hiển thị mặc định:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trip) return null;

  // Tính số ngày
  const calculateDays = () => {
    if (!trip.startDate || !trip.endDate) return 3;
    const s = new Date(trip.startDate);
    const e = new Date(trip.endDate);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const totalDays = calculateDays();

  // Nhóm các hoạt động theo ngày (Day 1, Day 2, ...)
  const groupItemsByDay = () => {
    if (!items || items.length === 0) return [];

    // Nhóm theo ngày thực tế của startTime
    const dayMap = new Map();
    const sorted = [...items].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Lấy mốc ngày bắt đầu làm Day 1
    const baseDate = new Date(sorted[0].startTime);
    baseDate.setHours(0, 0, 0, 0);

    sorted.forEach((item) => {
      const itemDate = new Date(item.startTime);
      itemDate.setHours(0, 0, 0, 0);
      const dayDiff = Math.max(0, Math.round((itemDate - baseDate) / (1000 * 60 * 60 * 24)));
      const dayNum = dayDiff + 1;

      if (!dayMap.has(dayNum)) {
        dayMap.set(dayNum, []);
      }
      dayMap.get(dayNum).push(item);
    });

    const result = [];
    const keys = Array.from(dayMap.keys()).sort((a, b) => a - b);
    keys.forEach((dayNum) => {
      result.push({
        dayNumber: dayNum,
        items: dayMap.get(dayNum)
      });
    });

    return result;
  };

  const groupedDays = groupItemsByDay();

  // Format giờ HH:mm
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  // Tách tags sở thích
  const preferenceTags = trip.preferences
    ? trip.preferences.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="preview-modal-header">
          <div className="preview-header-left">
            <div className="preview-top-badges">
              <span className="preview-badge-hot">
                <Flame size={13} />
                <span>Template Nổi Bật</span>
              </span>
              <span className="preview-badge-clones">
                <TrendingUp size={13} />
                <span>{trip.cloneCount || 0} lượt clone</span>
              </span>
              <span className="preview-badge-dest">
                <MapPin size={13} />
                <span>{trip.destination || 'Việt Nam'}</span>
              </span>
            </div>

            <h2 className="preview-modal-title">{trip.title}</h2>

            <div className="preview-modal-meta-row">
              <span className="preview-meta-pill">
                <Clock size={14} />
                <span>{totalDays} ngày {Math.max(1, totalDays - 1)} đêm</span>
              </span>
              {trip.origin && (
                <span className="preview-meta-pill">
                  <span>Xuất phát: <strong>{trip.origin}</strong></span>
                </span>
              )}
              <span className="preview-meta-pill budget">
                <DollarSign size={14} />
                <span>
                  Dự trù:{' '}
                  <strong>
                    {trip.budget > 0
                      ? `${Number(trip.budget).toLocaleString('vi-VN')} đ`
                      : 'Tiết kiệm'}
                  </strong>
                </span>
              </span>
            </div>
          </div>

          <div className="preview-header-right">
            <button
              type="button"
              className="preview-quick-clone-btn"
              onClick={() => onUseTemplate(trip)}
            >
              <Sparkles size={16} />
              <span>Clone lịch trình này ngay</span>
            </button>

            <button
              type="button"
              className="preview-close-btn"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Banner / Preference tags */}
        {preferenceTags.length > 0 && (
          <div className="preview-tags-bar">
            <span className="preview-tags-label">Điểm nhấn chuyến đi:</span>
            <div className="preview-tags-list">
              {preferenceTags.map((tag, idx) => (
                <span key={idx} className="preview-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body: Day-by-Day Itinerary */}
        <div className="preview-modal-body">
          <div className="preview-body-headline">
            <div className="preview-body-headline-left">
              <Calendar size={18} className="preview-icon-accent" />
              <h3>Chi tiết từng chặng ({items.length} hoạt động)</h3>
            </div>
            <span className="preview-readonly-badge">
              <ShieldCheck size={14} />
              <span>Chế độ xem trước • Chỉ đọc</span>
            </span>
          </div>

          {loading ? (
            <div className="preview-loading-box">
              <div className="preview-spinner"></div>
              <p>Đang tải chi tiết các chặng hành trình...</p>
            </div>
          ) : groupedDays.length === 0 ? (
            <div className="preview-empty-itinerary">
              <Compass size={36} style={{ color: '#1e6b65', marginBottom: '8px' }} />
              <p>Chưa có danh sách chặng cụ thể cho lịch trình này.</p>
            </div>
          ) : (
            <div className="preview-days-wrapper">
              {groupedDays.map((group) => (
                <div key={group.dayNumber} className="preview-day-card">
                  <div className="preview-day-header">
                    <div className="preview-day-badge">Ngày {group.dayNumber}</div>
                    <div className="preview-day-sub">
                      {group.items.length} điểm đến & hoạt động
                    </div>
                  </div>

                  <div className="preview-timeline">
                    {group.items.map((item, idx) => (
                      <div key={item.id || idx} className="preview-timeline-item">
                        <div className="preview-time-col">
                          <span className="preview-time-start">{formatTime(item.startTime)}</span>
                          <span className="preview-time-sep">-</span>
                          <span className="preview-time-end">{formatTime(item.endTime)}</span>
                        </div>

                        <div className="preview-dot-track">
                          <div className="preview-timeline-dot"></div>
                          {idx < group.items.length - 1 && <div className="preview-timeline-line"></div>}
                        </div>

                        <div className="preview-item-content">
                          <div className="preview-item-title-row">
                            <h4 className="preview-item-title">{item.title}</h4>
                            {item.transport && (
                              <span className="preview-item-transport">
                                <Car size={12} />
                                <span>{item.transport}</span>
                              </span>
                            )}
                          </div>

                          {item.location && (
                            <div className="preview-item-location">
                              <MapPin size={13} />
                              <span>{item.location}</span>
                            </div>
                          )}

                          {item.notes && (
                            <p className="preview-item-notes">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="preview-modal-footer">
          <div className="preview-footer-info">
            <CheckCircle2 size={16} className="preview-check-icon" />
            <span>
              Tự động tịnh tiến ngày và chuyển giao quyền làm chủ lịch trình cho bạn.
            </span>
          </div>

          <div className="preview-footer-actions">
            <button type="button" className="preview-btn-cancel" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="preview-btn-primary"
              onClick={() => onUseTemplate(trip)}
            >
              <span>🔥 Sử dụng Template này để lên kế hoạch</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
