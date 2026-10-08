import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import { Bell, Check, X, MapPin, Calendar, Loader2 } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchTrips = async () => {
    try {
      const res = await api.get('/Trip');
      // Xếp chuyến đi mới tạo lên đầu
      const sortedTrips = res.data.sort((a, b) => new Date(b.createdAt || new Date()) - new Date(a.createdAt || new Date()));
      setTrips(sortedTrips);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/users/me/invitations');
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchInvitations();

    const handleInviUpdate = () => {
      fetchTrips();
      fetchInvitations();
    };

    window.addEventListener('invitationsUpdated', handleInviUpdate);
    return () => window.removeEventListener('invitationsUpdated', handleInviUpdate);
  }, []);

  const handleRespondInvitation = async (invitation, accept) => {
    setActionLoadingId(invitation.tripMemberId);
    try {
      const res = await api.put(`/invitations/${invitation.tripMemberId}/respond`, {
        accept
      });
      setToastMsg({
        type: 'success',
        text: res.data?.message || (accept ? 'Đã tham gia chuyến đi!' : 'Đã từ chối lời mời.')
      });
      setTimeout(() => setToastMsg(null), 4000);

      // Cập nhật lại danh sách lời mời và danh sách chuyến đi
      setInvitations(prev => prev.filter(i => i.tripMemberId !== invitation.tripMemberId));
      await fetchTrips();
      window.dispatchEvent(new Event('invitationsUpdated'));
    } catch (err) {
      setToastMsg({
        type: 'error',
        text: err.response?.data?.message || 'Không thể xử lý phản hồi.'
      });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chuyến đi này không? Mọi dữ liệu liên quan sẽ bị xóa.")) return;
    try {
      await api.delete(`/Trip/${id}`);
      setTrips(trips.filter(t => t.id !== id));
      if (localStorage.getItem('currentTripId') == id) {
        localStorage.removeItem('currentTripId');
      }
    } catch (err) {
      alert("Không thể xóa chuyến đi.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2 style={{marginTop: 40}}>Đang tải dữ liệu chuyến đi...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 28,
          background: toastMsg.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 14,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 99999,
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>{toastMsg.type === 'success' ? '✓' : '✕'}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Lời mời đang chờ phản hồi */}
      {invitations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #122B29 0%, #1A3E3B 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 32,
          color: '#ffffff',
          boxShadow: '0 12px 32px rgba(18, 43, 41, 0.25)',
          border: '1px solid rgba(210, 244, 125, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(210, 244, 125, 0.2)', color: '#d2f47d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Bạn có {invitations.length} lời mời tham gia chuyến đi
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>
                Xác nhận để cùng bạn bè đồng hành và lên lịch trình chung
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {invitations.map((inv) => {
              const isProcessing = actionLoadingId === inv.tripMemberId;
              const startDateStr = inv.startDate ? new Date(inv.startDate).toLocaleDateString('vi-VN') : '';
              const endDateStr = inv.endDate ? new Date(inv.endDate).toLocaleDateString('vi-VN') : '';

              return (
                <div key={inv.tripMemberId} style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                      {inv.tripTitle}
                    </h3>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                      Mới
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inv.destination && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} color="#f87171" /> Điểm đến: {getShortLocation(inv.destination)}
                      </span>
                    )}
                    {startDateStr && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} color="#60a5fa" /> {startDateStr} - {endDateStr}
                      </span>
                    )}
                    <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#d2f47d', color: '#122b29', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {inv.inviterName ? inv.inviterName.charAt(0).toUpperCase() : 'H'}
                      </span>
                      <span>Người mời: <strong>{inv.inviterName || 'Chủ chuyến đi'}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondInvitation(inv, true)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Đồng ý
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondInvitation(inv, false)}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fca5a5',
                        border: '1px solid rgba(252, 165, 165, 0.4)',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <X size={14} />
                      Từ chối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Chuyến đi của tôi</h1>
          <p className="page-subtitle">Danh sách các chuyến đi bạn đang tham gia hoặc tổ chức.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/create-trip')}>+ Tạo chuyến đi</button>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: 8 }}>Bạn chưa có chuyến đi nào</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Hãy bắt đầu lên kế hoạch bằng cách tạo chuyến đi đầu tiên nhé.</p>
          <button className="btn-primary" onClick={() => navigate('/create-trip')}>Tạo chuyến đi ngay</button>
        </div>
      ) : (
        <div className="trips-list" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {trips.map(trip => (
            <div key={trip.id} className="hero-banner" style={{ margin: 0 }}>
              <div className="badge">MỚI TẠO</div>
              <h2 className="hero-title">{formatItemTitle(trip.title)}</h2>
              <p className="hero-subtitle">
                Điểm đến: {getShortLocation(trip.destination)} · Từ {new Date(trip.startDate).toLocaleDateString('vi-VN')} đến {new Date(trip.endDate).toLocaleDateString('vi-VN')}
              </p>
              
              <div className="hero-actions">
                <button className="btn-outline" onClick={() => {
                  localStorage.setItem('currentTripId', trip.id);
                  navigate('/itinerary');
                }}>Mở chi tiết</button>
                <button className="btn-danger-sm" onClick={() => handleDeleteTrip(trip.id)} style={{marginLeft: '12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}>Xóa</button>
                <div className="member-avatars" style={{marginLeft: 'auto'}}>
                  <div className="avatar-circle c1"></div>
                  <span className="member-count">{trip.numberOfParticipants} thành viên</span>
                  <span className="member-count" style={{marginLeft: 16}}>Ngân sách: {trip.budget.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
