import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation } from '../utils/formatLocation';
import { UserPlus, Bell, Check, X, MapPin, Calendar, Clock, Loader2, RefreshCw, Mail } from 'lucide-react';
import InviteMemberModal from '../components/InviteMemberModal';
import TripNavigation from '../components/TripNavigation';
import './CompanionsPage.css';

const CompanionsPage = () => {
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationsDropdown, setShowInvitationsDropdown] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

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

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/users/me/invitations');
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchInvitations();

    const handleUpdate = () => {
      fetchTrips();
      fetchInvitations();
    };

    window.addEventListener('invitationsUpdated', handleUpdate);
    return () => window.removeEventListener('invitationsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    if (trips.length > 0) {
      const params = new URLSearchParams(location.search);
      const tripIdFromUrl = params.get('tripId');
      if (tripIdFromUrl && (!selectedTrip || selectedTrip.id !== parseInt(tripIdFromUrl))) {
        const trip = trips.find(t => t.id === parseInt(tripIdFromUrl));
        if (trip) {
          handleSelectTrip(trip);
        }
      }
    }
  }, [location.search, trips]);

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
      const res = await api.put(`/invitations/${invitation.tripMemberId}/respond`, { accept });
      setToast({ type: 'success', text: res.data?.message || (accept ? 'Đã tham gia!' : 'Đã từ chối.') });
      setInvitations(prev => prev.filter(item => item.tripMemberId !== invitation.tripMemberId));
      fetchTrips();
      window.dispatchEvent(new CustomEvent('invitationsUpdated'));
    } catch (err) {
      setToast({ type: 'error', text: 'Có lỗi xảy ra.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setLoadingMembers(true);
    try {
      const res = await api.get(`/Trip/${trip.id}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error("Failed to load members", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleBack = () => {
    setSelectedTrip(null);
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  // VIEW 1: DANH SÁCH LỊCH TRÌNH
  if (!selectedTrip) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Quản lý Bạn đồng hành</h1>
            <p className="page-subtitle">Chọn một lịch trình để xem và quản lý thành viên tham gia.</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                background: 'transparent', border: 'none', 
                cursor: 'pointer', padding: '8px', zIndex: 10
              }}
              title="Lời mời chuyến đi"
              onClick={() => setShowInvitationsDropdown(!showInvitationsDropdown)}
            >
              <Bell size={28} color="#ef4444" />
              {invitations.length > 0 && (
                <span style={{ 
                  position: 'absolute', top: 2, right: 2,
                  backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 'bold', 
                  padding: '2px 6px', borderRadius: '10px', border: '2px solid #f8fafc'
                }}>
                  {invitations.length}
                </span>
              )}
            </button>
            {showInvitationsDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                width: '350px', background: '#fff', borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #eaeaea',
                zIndex: 100, overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #eaeaea', background: '#f8fafc', fontWeight: 'bold' }}>
                  Lời mời chuyến đi
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {invitations.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                      <Mail size={32} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>Không có thông báo nào</p>
                    </div>
                  ) : (
                    <div className="invi-page-grid" style={{ padding: '16px', gridTemplateColumns: '1fr', gap: '12px' }}>
                      {invitations.map((item) => {
                        const isProcessing = actionLoadingId === item.tripMemberId;
                        return (
                          <div key={item.tripMemberId} className="invi-page-card" style={{ padding: '12px' }}>
                            <div className="invi-page-card-header" style={{ marginBottom: '8px' }}>
                              <h3 className="invi-page-trip-title" style={{ fontSize: '15px' }}>{item.tripTitle}</h3>
                              <span className="invi-page-status-badge" style={{ fontSize: '11px' }}>
                                <Clock size={10} /> Chờ
                              </span>
                            </div>
                            <div className="invi-page-inviter-box" style={{ background: 'transparent', padding: 0, marginBottom: '12px' }}>
                              <div className="invi-page-inviter-initials" style={{ width: 28, height: 28, fontSize: '12px' }}>
                                {item.inviterName ? item.inviterName.charAt(0).toUpperCase() : 'H'}
                              </div>
                              <div className="invi-page-inviter-info">
                                <span className="invi-page-inviter-name" style={{ fontSize: '13px' }}>{item.inviterName || 'Chủ chuyến đi'}</span>
                              </div>
                            </div>
                            <div className="invi-page-actions" style={{ gap: '8px' }}>
                              <button type="button" disabled={isProcessing} onClick={() => handleRespond(item, false)} className="invi-page-btn-decline" style={{ height: '32px', fontSize: '12px', flex: 1 }}>
                                <X size={14} /><span>Từ chối</span>
                              </button>
                              <button type="button" disabled={isProcessing} onClick={() => handleRespond(item, true)} className="invi-page-btn-accept" style={{ height: '32px', fontSize: '12px', flex: 1 }}>
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                <span>Đồng ý</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '32px', marginBottom: '16px' }}>Danh sách chuyến đi của bạn</h2>
        <div className="explore-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div key={t.id} onClick={() => handleSelectTrip(t)} style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #FF9A9E, #FECFEF)' }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{display: 'flex', alignItems: 'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Nhóm: {t.numberOfParticipants || 1} người</span>
                    <span style={{display: 'flex', alignItems: 'center', marginTop: 4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Điểm đến: {getShortLocation(t.destination)}</span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#ff7b89', fontSize: '14px' }}>
                    + Mở danh sách thành viên
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: CHI TIẾT THÀNH VIÊN
  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Lịch trình
        </button>
      </div>

      <TripNavigation selectedTripId={selectedTrip.id} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Nhóm đi {selectedTrip.title}</h1>
          <p className="page-subtitle">Quản lý {selectedTrip.numberOfParticipants || 1} thành viên và quyền truy cập vào chuyến đi này.</p>
        </div>
        <button 
          className="btn-primary"
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setShowInviteModal(true)}
        >
          <UserPlus size={18} />
          <span>Mời thành viên</span>
        </button>
      </div>
      
      <div className="timeline-section mt-8" style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        {loadingMembers ? (
          <p style={{textAlign: 'center', color: '#666'}}>Đang tải danh sách thành viên...</p>
        ) : members.length === 0 ? (
          <p style={{textAlign: 'center', color: '#666'}}>Chưa có thành viên nào.</p>
        ) : (
          members.map((member, index) => {
            const isHost = (member.role || '').toLowerCase().includes('host');
            return (
              <div key={member.id} style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: index === members.length - 1 ? 0 : 24, paddingBottom: index === members.length - 1 ? 0 : 24, borderBottom: index === members.length - 1 ? 'none' : '1px solid #eee'}}>
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className={`avatar-circle c${(index % 5) + 1}`} style={{width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: isHost ? '#e0f2fe' : '#fce7f3', color: isHost ? '#0369a1' : '#be185d', borderRadius: '50%', fontSize: '18px'}}>
                    {member.initials}
                  </div>
                )}
                <div>
                  <h3 style={{fontSize: 16, fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px'}}>{member.name}</h3>
                  <span style={{ fontSize: 12, background: isHost ? '#fee2e2' : '#f3f4f6', color: isHost ? '#dc2626' : '#4b5563', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>{member.role}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripId={selectedTrip?.id}
        tripTitle={selectedTrip?.title}
        onMemberAdded={() => {
          if (selectedTrip) {
            handleSelectTrip(selectedTrip);
          }
        }}
      />
    </div>
  );
};

export default CompanionsPage;
