import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, MapPin, Calendar, Clock, Loader2, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import api from '../services/api';
import { getShortLocation } from '../utils/formatLocation';
import './InvitationsPage.css';

const InvitationsPage = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me/invitations');
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lời mời:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();

    const handleUpdate = () => {
      fetchInvitations();
    };

    window.addEventListener('invitationsUpdated', handleUpdate);
    return () => window.removeEventListener('invitationsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleRespond = async (invitation, accept) => {
    setActionLoadingId(invitation.tripMemberId);
    setToast(null);

    try {
      const res = await api.put(`/invitations/${invitation.tripMemberId}/respond`, {
        accept
      });

      const msg = res.data?.message || (accept ? 'Đã tham gia chuyến đi thành công!' : 'Đã từ chối lời mời.');
      setToast({
        type: 'success',
        text: msg
      });

      // Bỏ lời mời khỏi danh sách
      setInvitations(prev => prev.filter(item => item.tripMemberId !== invitation.tripMemberId));

      // Bắn event cập nhật toàn cục
      window.dispatchEvent(new CustomEvent('invitationsUpdated', {
        detail: { acceptedTripId: accept ? invitation.tripId : null }
      }));

      // Nếu accept, lưu ID chuyến đi hiện tại để tiện xem
      if (accept) {
        localStorage.setItem('currentTripId', invitation.tripId);
      }
    } catch (err) {
      console.error('Lỗi khi phản hồi lời mời:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi phản hồi lời mời.';
      setToast({
        type: 'error',
        text: errMsg
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 28,
          background: toast.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '12px 22px',
          borderRadius: 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
          zIndex: 99999,
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={28} style={{ color: '#f59e0b' }} /> Lời mời chuyến đi
          </h1>
          <p className="page-subtitle">
            Xem và phản hồi các chuyến đi bạn được bạn bè mời cùng đồng hành.
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={fetchInvitations}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>Làm mới</span>
        </button>
      </div>

      {/* Nội dung */}
      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: '#1e6b65' }} />
          <p style={{ fontSize: 16, fontWeight: 500 }}>Đang kiểm tra lời mời chuyến đi mới...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="invi-page-empty-box">
          <div className="invi-page-empty-icon" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}><Mail size={48} style={{ color: '#94a3b8' }} /></div>
          <h2 className="invi-page-empty-title">Không có lời mời nào đang chờ</h2>
          <p className="invi-page-empty-desc">
            Khi bạn bè thêm bạn vào kế hoạch chuyến đi của họ, lời mời sẽ hiển thị tại đây để bạn xác nhận tham gia.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Xem chuyến đi của tôi
            </button>
            <button className="btn-secondary" onClick={() => navigate('/create-trip')}>
              + Tạo chuyến đi mới
            </button>
          </div>
        </div>
      ) : (
        <div className="invi-page-grid">
          {invitations.map((item) => {
            const isProcessing = actionLoadingId === item.tripMemberId;
            const startDateStr = item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '';
            const endDateStr = item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : '';

            return (
              <div key={item.tripMemberId} className="invi-page-card">
                <div className="invi-page-card-header">
                  <h3 className="invi-page-trip-title">{item.tripTitle}</h3>
                  <span className="invi-page-status-badge">
                    <Clock size={12} />
                    Chờ bạn phản hồi
                  </span>
                </div>

                <div className="invi-page-meta-list">
                  {item.destination && (
                    <div className="invi-page-meta-item">
                      <MapPin size={16} color="#ef4444" style={{ shrink: 0 }} />
                      <span>Điểm đến: <strong>{getShortLocation(item.destination)}</strong></span>
                    </div>
                  )}
                  {startDateStr && (
                    <div className="invi-page-meta-item">
                      <Calendar size={16} color="#0284c7" style={{ shrink: 0 }} />
                      <span>Thời gian: {startDateStr} {endDateStr ? `- ${endDateStr}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Khối người mời */}
                <div className="invi-page-inviter-box">
                  {item.inviterAvatarUrl ? (
                    <img 
                      src={item.inviterAvatarUrl} 
                      alt={item.inviterName} 
                      className="invi-page-inviter-avatar"
                    />
                  ) : (
                    <div className="invi-page-inviter-initials">
                      {item.inviterName ? item.inviterName.charAt(0).toUpperCase() : 'H'}
                    </div>
                  )}
                  <div className="invi-page-inviter-info">
                    <span className="invi-page-inviter-name">
                      {item.inviterName || 'Chủ chuyến đi'}
                    </span>
                    <span className="invi-page-inviter-desc">
                      {item.inviterEmail ? item.inviterEmail : 'Đã mời bạn cùng lên kế hoạch'}
                    </span>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="invi-page-actions">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRespond(item, false)}
                    className="invi-page-btn-decline"
                  >
                    <X size={16} />
                    <span>Từ chối</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRespond(item, true)}
                    className="invi-page-btn-accept"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Đồng ý tham gia</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvitationsPage;
