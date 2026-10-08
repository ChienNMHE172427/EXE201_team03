import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { X, Calendar, Sparkles, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import './CloneTripModal.css';

const CloneTripModal = ({ isOpen, trip, onClose, onCloneSuccess }) => {
  const navigate = useNavigate();

  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [newTripName, setNewTripName] = useState('');
  const [newStartDate, setNewStartDate] = useState(getDefaultStartDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (trip) {
      setNewTripName(`${trip.title} (Của tôi)`);
      setNewStartDate(getDefaultStartDate());
      setError(null);
    }
  }, [trip, isOpen]);

  if (!isOpen || !trip) return null;

  // Tính số ngày của chuyến đi mẫu
  const calculateDays = () => {
    if (!trip.startDate || !trip.endDate) return 'Lịch trình mẫu';
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ngày ${Math.max(1, diffDays - 1)} đêm`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { returnUrl: window.location.pathname } });
      return;
    }

    if (!newTripName.trim()) {
      setError('Vui lòng nhập tên chuyến đi.');
      return;
    }

    if (!newStartDate) {
      setError('Vui lòng chọn ngày khởi hành.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        newTripName: newTripName.trim(),
        newStartDate: new Date(`${newStartDate}T08:00:00Z`).toISOString()
      };

      const res = await api.post(`/trips/${trip.id}/clone`, payload);
      const newTripId = res.data?.id || res.data;

      if (onCloneSuccess) {
        onCloneSuccess(newTripId);
      }
    } catch (err) {
      console.error('Lỗi khi sao chép lịch trình:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể sao chép lịch trình. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clone-modal-overlay" onClick={onClose}>
      <div className="clone-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="clone-modal-header">
          <div>
            <div className="clone-modal-badge">
              <Sparkles size={13} />
              <span>TEMPLATE CHUẨN</span>
            </div>
            <h3 className="clone-modal-title">Sử dụng Template Lịch trình</h3>
            <p className="clone-modal-subtitle">
              Tạo chuyến đi mới từ: <strong>{trip.title}</strong>
            </p>
          </div>
          <button 
            type="button" 
            className="clone-modal-close-btn" 
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="clone-modal-body">
            {/* Card Preview chặng gốc */}
            <div className="clone-preview-card">
              <div className="clone-preview-info">
                <div className="clone-preview-name">{trip.title}</div>
                <div className="clone-preview-meta">
                  <span>📍 {trip.destination || 'Việt Nam'}</span>
                  <span>•</span>
                  <span>⏱️ {calculateDays()}</span>
                  <span>•</span>
                  <span>🔥 {trip.cloneCount || 0} lượt dùng</span>
                </div>
              </div>
              <span className="clone-preview-tag">Bản mẫu Hot</span>
            </div>

            {error && (
              <div className="clone-error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Input: Tên chuyến đi mới */}
            <div className="clone-form-group">
              <label className="clone-form-label">
                <span>Tên chuyến đi của bạn</span>
                <span className="clone-form-hint">Bạn có thể đổi tên tùy ý</span>
              </label>
              <input
                type="text"
                className="clone-form-input"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Nhập tên chuyến đi..."
                required
                disabled={loading}
              />
            </div>

            {/* Input: Ngày khởi hành */}
            <div className="clone-form-group">
              <label className="clone-form-label">
                <span>Ngày khởi hành mong muốn</span>
                <span className="clone-form-hint">Tự động tịnh tiến các chặng</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="clone-form-input"
                  value={newStartDate}
                  min={getMinDate()}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Info highlight */}
            <div className="clone-info-box">
              <CheckCircle2 size={16} className="clone-info-icon" />
              <p className="clone-info-text">
                Toàn bộ các địa điểm, giờ giấc và chặng hoạt động sẽ tự động dịch chuyển theo ngày bạn chọn. Dữ liệu chi phí cá nhân và thành viên cũ được giữ riêng tư hoàn toàn!
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="clone-modal-footer">
            <button
              type="button"
              className="clone-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="clone-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="clone-spinner"></div>
                  <span>Đang sao chép lịch trình...</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>🚀 Bắt đầu nhân bản</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloneTripModal;
