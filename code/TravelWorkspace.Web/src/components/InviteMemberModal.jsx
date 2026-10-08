import React, { useState, useEffect } from 'react';
import { UserPlus, X, Mail, CheckCircle, AlertCircle, Loader2, Crown, Shield, Clock } from 'lucide-react';
import api from '../services/api';
import './InviteMemberModal.css';

const InviteMemberModal = ({ isOpen, onClose, tripId, tripTitle, onMemberAdded }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  useEffect(() => {
    if (isOpen && tripId) {
      setEmail('');
      setToast(null);
      fetchMembers();
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchMembers = async () => {
    if (!tripId) return;
    setLoadingMembers(true);
    try {
      const res = await api.get(`/trips/${tripId}/members`);
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Không thể tải danh sách thành viên:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setToast({
        type: 'error',
        message: 'Vui lòng nhập địa chỉ email người bạn muốn mời.'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setToast({
        type: 'error',
        message: 'Định dạng email không hợp lệ.'
      });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      const res = await api.post(`/trips/${tripId}/invite`, {
        email: trimmedEmail
      });

      const successMsg = res.data?.message || 'Đã gửi lời mời thành công! Người nhận sẽ thấy thông báo để xác nhận.';
      setToast({
        type: 'success',
        message: successMsg
      });
      setEmail('');

      // Tải lại danh sách thành viên (sẽ có thêm thành viên với status Pending)
      await fetchMembers();

      if (typeof onMemberAdded === 'function') {
        onMemberAdded();
      }
    } catch (err) {
      console.error('Lỗi khi mời thành viên:', err);
      let errorMsg = 'Đã xảy ra lỗi khi gửi lời mời.';

      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMsg = 'Chỉ người tạo chuyến đi (Owner) mới có quyền mời thành viên.';
      } else if (err.response?.status === 404) {
        errorMsg = 'Không tìm thấy tài khoản với email này trong hệ thống.';
      } else if (err.response?.status === 400) {
        errorMsg = err.response.data || 'Người dùng đã là thành viên hoặc đã được gửi lời mời trước đó.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setToast({
        type: 'error',
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="invite-modal-overlay" onClick={onClose}>
      <div 
        className="invite-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="invite-modal-header">
          <div className="invite-modal-header-left">
            <div className="invite-modal-icon-badge">
              <UserPlus size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="invite-modal-title">Mời bạn bè cộng tác</h2>
              <p className="invite-modal-subtitle">
                {tripTitle ? `Chuyến đi: ${tripTitle}` : 'Thêm bạn đồng hành cùng lên kế hoạch'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="invite-modal-close-btn"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="invite-modal-body">
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

          {/* Form Mời */}
          <form onSubmit={handleInvite} className="invite-form-group">
            <label className="invite-label">Email người muốn mời</label>
            <div className="invite-input-row">
              <div className="invite-input-wrapper">
                <Mail size={18} className="invite-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email (ví dụ: friend@example.com)..."
                  disabled={loading}
                  className="invite-input-field"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="invite-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Gửi lời mời</span>
                  </>
                )}
              </button>
            </div>
            <p className="invite-helper-text">
              * Người được mời sẽ nhận được thông báo để Chấp nhận hoặc Từ chối tham gia chuyến đi.
            </p>
          </form>

          {/* Danh sách thành viên */}
          <div className="invite-members-section">
            <div className="invite-members-header">
              <h3 className="invite-members-title">
                Thành viên trong chuyến đi ({members.length})
              </h3>
              {loadingMembers && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
                  <Loader2 size={13} className="animate-spin" />
                  Đang tải...
                </span>
              )}
            </div>

            {loadingMembers && members.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#1e6b65' }} />
                <p style={{ fontSize: 13, margin: 0 }}>Đang tải danh sách thành viên...</p>
              </div>
            ) : members.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
                <p style={{ fontSize: 13, margin: 0 }}>Chưa có thành viên nào.</p>
              </div>
            ) : (
              <div className="invite-members-list">
                {members.map((member, index) => {
                  const isHost = (member.role || '').toLowerCase().includes('host');
                  const isPending = (member.status || '').toLowerCase() === 'pending';

                  // Màu avatar ngẫu nhiên hoặc theo index
                  const avatarBgs = [
                    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    'linear-gradient(135deg, #10b981, #047857)',
                    'linear-gradient(135deg, #f59e0b, #b45309)',
                    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    'linear-gradient(135deg, #ec4899, #be185d)'
                  ];
                  const bgStyle = avatarBgs[index % avatarBgs.length];

                  return (
                    <div key={member.id || index} className="invite-member-card">
                      <div className="invite-member-info-left">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="invite-member-avatar"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.style.removeProperty('display');
                            }}
                          />
                        ) : null}
                        <div
                          className="invite-member-avatar-initials"
                          style={{
                            display: member.avatarUrl ? 'none' : 'flex',
                            background: isHost ? 'linear-gradient(135deg, #f59e0b, #d97706)' : bgStyle,
                            color: '#ffffff'
                          }}
                        >
                          {member.initials || (member.name ? member.name.charAt(0).toUpperCase() : 'U')}
                        </div>

                        <div className="invite-member-details">
                          <span className="invite-member-name">
                            {member.name || 'Người dùng'}
                          </span>
                          {member.email && (
                            <span className="invite-member-email">{member.email}</span>
                          )}
                        </div>
                      </div>

                      {/* Tag vai trò / Trạng thái */}
                      <div>
                        {isHost ? (
                          <span className="invite-badge invite-badge-host">
                            <Crown size={13} />
                            Host
                          </span>
                        ) : isPending ? (
                          <span className="invite-badge invite-badge-pending">
                            <Clock size={13} />
                            Chờ xác nhận
                          </span>
                        ) : (
                          <span className="invite-badge invite-badge-member">
                            <Shield size={13} />
                            Member
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="invite-modal-footer">
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

export default InviteMemberModal;
