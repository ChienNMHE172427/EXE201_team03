import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  X, 
  Sparkles, 
  Flame, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  Search, 
  Eye, 
  Check, 
  Loader2, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getShortLocation } from '../utils/formatLocation';
import { getDestinationImage, matchDestination } from '../utils/destinationImages';
import './TemplateSuggestModal.css';

const TemplateSuggestModal = ({ 
  isOpen, 
  onClose, 
  currentTrip, 
  hasExistingItems = false, 
  onApplySuccess, 
  onPreviewTemplate,
  onCloneTrip 
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'all'
  const [applyingTemplateId, setApplyingTemplateId] = useState(null);
  const [confirmOverwriteModal, setConfirmOverwriteModal] = useState({
    isOpen: false,
    template: null
  });

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates();
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips/public');
      const publicTrips = (res.data || [])
        .filter(t => t.isPublic === true)
        .sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));
      setTemplates(publicTrips);
    } catch (err) {
      console.error('Lỗi khi tải danh sách template mẫu:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tính số ngày
  const calculateDays = (trip) => {
    if (!trip.startDate || !trip.endDate) return '3 ngày 2 đêm';
    const s = new Date(trip.startDate);
    const e = new Date(trip.endDate);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ngày ${Math.max(1, diff - 1)} đêm`;
  };

  // Phân loại template khớp với điểm đến của chuyến đi
  const { matchedTemplates, otherTemplates } = useMemo(() => {
    const matched = [];
    const others = [];

    templates.forEach(tpl => {
      const isMatch = currentTrip 
        ? matchDestination(currentTrip.destination, tpl.destination, tpl.title)
        : false;

      if (isMatch) {
        matched.push(tpl);
      } else {
        others.push(tpl);
      }
    });

    return { matchedTemplates: matched, otherTemplates: others };
  }, [templates, currentTrip]);

  // Tự động chuyển tab nếu không có template khớp
  useEffect(() => {
    if (!loading && matchedTemplates.length === 0 && activeTab === 'matched') {
      setActiveTab('all');
    }
  }, [matchedTemplates.length, loading]);

  // Lọc theo search query
  const displayedTemplates = useMemo(() => {
    let sourceList = activeTab === 'matched' ? matchedTemplates : templates;
    if (!searchQuery.trim()) return sourceList;

    const q = searchQuery.toLowerCase().trim();
    return sourceList.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.destination && t.destination.toLowerCase().includes(q)) ||
      (t.origin && t.origin.toLowerCase().includes(q)) ||
      (t.preferences && t.preferences.toLowerCase().includes(q))
    );
  }, [activeTab, matchedTemplates, templates, searchQuery]);

  // Xử lý áp dụng template
  const handleApplyClick = (template) => {
    if (!currentTrip) return;
    
    // Nếu chuyến đi hiện đã có các chặng, hiển thị xác nhận ghi đè hoặc thêm nối tiếp
    if (hasExistingItems) {
      setConfirmOverwriteModal({
        isOpen: true,
        template
      });
      return;
    }

    // Nếu chưa có chặng nào, áp dụng ngay
    executeApplyTemplate(template, false);
  };

  const executeApplyTemplate = async (template, overwrite = false) => {
    if (!currentTrip) return;
    setApplyingTemplateId(template.id);
    try {
      await api.post(`/trips/${currentTrip.id}/apply-template/${template.id}?overwrite=${overwrite}`);
      setConfirmOverwriteModal({ isOpen: false, template: null });
      if (onApplySuccess) {
        onApplySuccess(template);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi áp dụng lịch trình mẫu:', err);
      alert('Không thể áp dụng lịch trình mẫu lúc này. Vui lòng thử lại!');
    } finally {
      setApplyingTemplateId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div className="template-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="template-modal-header">
          <button 
            type="button" 
            className="template-modal-close-btn" 
            onClick={onClose} 
            title="Đóng"
          >
            <X size={20} />
          </button>

          <div className="template-modal-badge">
            <Sparkles size={13} />
            <span>GỢI Ý LỊCH TRÌNH MẪU THÔNG MINH</span>
          </div>

          <h2 className="template-modal-title">
            Template Lịch Trình Mẫu Đề Xuất
          </h2>

          <p className="template-modal-subtitle">
            Chọn và áp dụng ngay các lịch trình du lịch chất lượng cao đã tối ưu sẵn địa điểm, thứ tự các chặng và khung giờ.
          </p>

          {currentTrip && (
            <div className="template-modal-context-pill">
              <div className="template-modal-context-item">
                <MapPin size={14} color="#f87171" />
                <span>Chuyến đi: <strong>{getShortLocation(currentTrip.destination) || currentTrip.title}</strong></span>
              </div>
              {currentTrip.startDate && currentTrip.endDate && (
                <div className="template-modal-context-item">
                  <Calendar size={14} color="#60a5fa" />
                  <span>
                    {new Date(currentTrip.startDate).toLocaleDateString('vi-VN')} - {new Date(currentTrip.endDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
              {currentTrip.numberOfParticipants && (
                <div className="template-modal-context-item">
                  <Users size={14} color="#34d399" />
                  <span>{currentTrip.numberOfParticipants} thành viên</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls: Tabs & Search */}
        <div className="template-modal-controls">
          <div className="template-tab-group">
            <button
              type="button"
              className={`template-tab-btn ${activeTab === 'matched' ? 'active' : ''}`}
              onClick={() => setActiveTab('matched')}
            >
              <Sparkles size={14} />
              <span>Gợi ý cho bạn ({matchedTemplates.length})</span>
            </button>
            <button
              type="button"
              className={`template-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Flame size={14} />
              <span>Tất cả Template ({templates.length})</span>
            </button>
          </div>

          <div className="template-search-wrapper">
            <Search size={15} className="template-search-icon" />
            <input
              type="text"
              placeholder="Tìm theo điểm đến, tên lịch trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="template-search-input"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="template-modal-body">
          {loading ? (
            <div className="template-empty-box">
              <Loader2 size={36} className="animate-spin" style={{ color: '#1E6B65', margin: '0 auto 12px' }} />
              <p>Đang tìm kiếm các lịch trình mẫu tốt nhất...</p>
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="template-empty-box">
              <div className="template-empty-icon">🏖️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                {activeTab === 'matched' 
                  ? `Chưa có template mẫu riêng cho ${currentTrip ? getShortLocation(currentTrip.destination) : 'điểm đến này'}`
                  : 'Không tìm thấy lịch trình mẫu phù hợp'}
              </h3>
              <p style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto 16px' }}>
                {activeTab === 'matched'
                  ? 'Hãy chuyển sang tab "Tất cả Template" để khám phá các lịch trình mẫu siêu hot tại các điểm du lịch khác!'
                  : 'Thử tìm kiếm với từ khóa khác hoặc khám phá tất cả các mẫu có sẵn.'}
              </p>
              {activeTab === 'matched' && (
                <button 
                  type="button"
                  className="btn-primary" 
                  onClick={() => setActiveTab('all')}
                  style={{ padding: '8px 20px', borderRadius: '10px' }}
                >
                  Xem tất cả {templates.length} Template
                </button>
              )}
            </div>
          ) : (
            <div className="template-cards-grid">
              {displayedTemplates.map((tpl) => {
                const isMatched = currentTrip 
                  ? matchDestination(currentTrip.destination, tpl.destination, tpl.title)
                  : false;
                const isApplying = applyingTemplateId === tpl.id;
                const coverImage = getDestinationImage(tpl.destination, tpl.title, tpl.imageUrl);
                const durationStr = calculateDays(tpl);

                return (
                  <div 
                    key={tpl.id} 
                    className={`template-suggest-card ${isMatched ? 'matched' : ''}`}
                  >
                    <div className="template-card-image-wrap">
                      <img src={coverImage} alt={tpl.title} className="template-card-img" />
                      {isMatched && (
                        <div className="template-matched-ribbon">
                          <Sparkles size={12} />
                          <span>Khớp điểm đến</span>
                        </div>
                      )}
                      <div className="template-clone-pill">
                        <TrendingUp size={12} />
                        <span>{tpl.cloneCount || 0} dùng</span>
                      </div>
                    </div>

                    <div className="template-card-content">
                      <div className="template-card-destination">
                        <MapPin size={13} />
                        <span>{getShortLocation(tpl.destination)}</span>
                      </div>

                      <h3 className="template-card-title">{tpl.title}</h3>

                      <div className="template-card-meta">
                        <span className="template-meta-item">
                          <Clock size={13} />
                          <span>{durationStr}</span>
                        </span>
                        {tpl.numberOfParticipants && (
                          <span className="template-meta-item">
                            <Users size={13} />
                            <span>{tpl.numberOfParticipants} người</span>
                          </span>
                        )}
                      </div>

                      {tpl.preferences && (
                        <div className="template-card-tags">
                          {tpl.preferences.split(',').slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="template-tag-pill">{tag.trim()}</span>
                          ))}
                        </div>
                      )}

                      <div className="template-card-actions">
                        <button
                          type="button"
                          className="template-btn-apply"
                          disabled={isApplying}
                          onClick={() => handleApplyClick(tpl)}
                        >
                          {isApplying ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Đang áp dụng...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={15} />
                              <span>Áp dụng vào chuyến đi này</span>
                            </>
                          )}
                        </button>

                        <div className="template-card-secondary-actions">
                          <button
                            type="button"
                            className="template-btn-preview"
                            onClick={() => onPreviewTemplate && onPreviewTemplate(tpl)}
                          >
                            <Eye size={13} />
                            <span>Xem trước</span>
                          </button>
                          <button
                            type="button"
                            className="template-btn-clone"
                            onClick={() => onCloneTrip && onCloneTrip(tpl)}
                          >
                            <Layers size={13} />
                            <span>Nhân bản mới</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal xác nhận ghi đè / thêm nối tiếp nếu chuyến đi đã có hoạt động */}
        {confirmOverwriteModal.isOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: '20px'
            }}
            onClick={() => setConfirmOverwriteModal({ isOpen: false, template: null })}
          >
            <div 
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '28px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>⚡</div>
              <h3 style={{ fontSize: '19px', fontWeight: '800', textAlign: 'center', color: '#0f172a', marginBottom: '10px' }}>
                Chuyến đi của bạn đã có hoạt động!
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>
                Bạn muốn <strong>thêm nối tiếp</strong> các hoạt động từ template "<em>{confirmOverwriteModal.template?.title}</em>" hay <strong>ghi đè toàn bộ</strong> lịch trình hiện tại?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#1E6B65',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={() => executeApplyTemplate(confirmOverwriteModal.template, false)}
                >
                  ➕ Thêm nối tiếp hoạt động
                </button>
                <button
                  type="button"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #f87171',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={() => executeApplyTemplate(confirmOverwriteModal.template, true)}
                >
                  🔄 Ghi đè toàn bộ lịch trình
                </button>
                <button
                  type="button"
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'transparent',
                    color: '#64748b',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setConfirmOverwriteModal({ isOpen: false, template: null })}
                >
                  Hủy thao tác
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSuggestModal;
