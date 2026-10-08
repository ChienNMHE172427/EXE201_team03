import React, { useState, useEffect } from 'react';
import { Mail, Check, X, MapPin, Calendar, User, Loader2, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import api from '../services/api';
import './InvitationsModal.css';

const InvitationsModal = ({ isOpen, onClose, onInvitationResponded }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null); // tripMemberId currently processing
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me/invitations');
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Không thể tải danh sách lời mời:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitation, accept) => {
    setActionLoadingId(invitation.tripMemberId);
    setToast(null);

    try {
      const res = await api.put(`/invitations/${invitation.tripMemberId}/respond`, {
        accept: accept
      });

      const message = res.data?.message || (accept ? 'Đã tham gia chuyến đi thành công!' : 'Đã từ chối lời mời.');
      setToast({
        type: 'success',
        message: message
      });

      // Xóa lời mời khỏi danh sách hiện tại
      setInvitations(prev => prev.filter(item => item.tripMemberId !== invitation.tripMemberId));

      // Bắn event toàn cục để Sidebar / Dashboard cập nhật badge và danh sách chuyến đi
      window.dispatchEvent(new CustomEvent('invitationsUpdated', { detail: { acceptedTripId: accept ? invitation.tripId : null } }));

      if (typeof onInvitationResponded === 'function') {
        onInvitationResponded(invitation, accept);
      }
    } catch (err) {
      console.error('Lỗi khi phản hồi lời mời:', err);
      const errMsg = err.response?.data?.message || 'Không thể xử lý yêu cầu phản hồi.';
      setToast({
        type: 'error',
        message: errMsg
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="invi-modal-overlay" onClick={onClose}>
      <div 
        className="invi-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="invi-modal-header">
          <div className="invi-modal-header-left">
            <div className="invi-modal-icon-badge">
              <Bell size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="invi-modal-title">Lời mời chuyến đi</h2>
              <p className="invi-modal-subtitle">
                Các chuyến đi bạn được bạn bè mời tham gia cộng tác
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="invi-modal-close-btn"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="invi-modal-body">
          {/* Toast Notification */}
          {toast && (
            <div className={`invite-toast ${toast.type === 'success' ? 'invite-toast-success' : 'invite-toast-error'}`}>
              {toast.type === 'success' ? (
                <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
              ) : (
                <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ flex: 1 }}>{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: '#1e6b65' }} />
              <p style={{ fontSize: 14, margin: 0 }}>Đang kiểm tra lời mời mới...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                Không có lời mời nào đang chờ
              </h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Khi bạn bè mời bạn vào kế hoạch chuyến đi của họ, thông báo sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {invitations.map((item) => {
                const isProcessing = actionLoadingId === item.tripMemberId;
                const startDateStr = item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '';
                const endDateStr = item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : '';

                return (
                  <div key={item.tripMemberId} className="invi-card">
                    <div className="invi-card-top">
                      <div>
                        <h4 className="invi-trip-title">{item.tripTitle}</h4>
                        <div className="invi-trip-meta">
                          {item.destination && (
                            <span className="invi-meta-item">
                              <MapPin size={14} color="#ef4444" />
                              {item.destination}
                            </span>
                          )}
                          {startDateStr && (
                            <span className="invi-meta-item">
                              <Calendar size={14} color="#3b82f6" />
                              {startDateStr} {endDateStr ? `- ${endDateStr}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="invite-badge invite-badge-pending">
                        Chờ phản hồi
                      </span>
                    </div>

                    <div className="invi-inviter-row">
                      {item.inviterAvatarUrl ? (
                        <img
                          src={item.inviterAvatarUrl}
                          alt={item.inviterName}
                          className="invi-inviter-avatar"
                        />
                      ) : (
                        <div className="invi-inviter-initials">
                          {item.inviterName ? item.inviterName.charAt(0).toUpperCase() : 'H'}
                        </div>
                      )}
                      <div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>
                          {item.inviterName || 'Chủ chuyến đi'}
                        </span>
                        <span style={{ color: '#6b7280', marginLeft: 6 }}>
                          đã mời bạn làm thành viên
                        </span>
                      </div>
                    </div>

                    <div className="invi-actions-row">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(item, false)}
                        className="invi-btn-decline"
                      >
                        <X size={15} />
                        <span>Từ chối</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(item, true)}
                        className="invi-btn-accept"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <Check size={15} />
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

        {/* Footer */}
        <div className="invi-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="invite-modal-cancel-btn"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationsModal;
