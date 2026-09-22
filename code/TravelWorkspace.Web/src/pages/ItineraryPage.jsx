import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import './ItineraryPage.css';

const ItineraryPage = () => {
  const getMapQuery = (item) => {
    let query = item.location || '';
    if (item.destination && item.destination !== 'Vui lòng chọn dịch vụ') {
      query = `${item.destination}, ${item.location}`;
    } else if (item.title && !item.title.toLowerCase().includes('khởi hành') && !item.title.toLowerCase().includes('đến')) {
      query = `${item.title}, ${item.location}`;
    }
    return encodeURIComponent(query.trim());
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(localStorage.getItem('currentTripId') ? parseInt(localStorage.getItem('currentTripId')) : null);
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For adding new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInfoItem, setSelectedInfoItem] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu'
  });
  // Chat AI
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(localStorage.getItem('geminiConnected') === 'true');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);

        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          handleSelectTrip({ id: parseInt(tripIdFromUrl) });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const fetchTripData = async (id) => {
    try {
      const tripRes = await api.get(`/Trip/${id}`);
      setTrip(tripRes.data);

      const itemsRes = await api.get(`/Itinerary/${id}`);
      setItems(itemsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchTripData(selectedTripId);
      const savedMessages = localStorage.getItem(`chat_${selectedTripId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([{ role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }]);
      }
    }
  }, [selectedTripId]);

  useEffect(() => {
    if (selectedTripId) {
      localStorage.setItem(`chat_${selectedTripId}`, JSON.stringify(messages));
    }
  }, [messages, selectedTripId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    if (!newItem.startTime || !newItem.endTime) {
      alert('Vui lòng chọn Giờ & Ngày bắt đầu và kết thúc.');
      return;
    }

    try {
      const res = await api.post(`/Itinerary/${selectedTripId}`, newItem);
      setItems([...items, res.data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setShowAddForm(false);
      setNewItem({ title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu' });
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.title) {
        alert('Lỗi: ' + err.response.data.title);
      } else {
        alert('Có lỗi khi thêm hoạt động. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Bạn có chắc muốn xóa hoạt động này?',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
        try {
          await api.delete(`/Itinerary/${id}`);
          setItems(items.filter(i => i.id !== id));
        } catch (err) {
          console.error(err);
          alert('Lỗi khi xóa.');
        }
      }
    });
  };

  const handleGenerateAi = async () => {
    setConfirmDialog({
      isOpen: true,
      message: 'Hành động này sẽ XÓA TOÀN BỘ lịch trình hiện tại và thay thế bằng lịch trình do AI gợi ý. Bạn có chắc chắn?',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
        setIsChatting(true);
        try {
          const res = await api.post(`/Itinerary/GenerateAi/${selectedTripId}`);
          setItems(res.data);
          setMessages([...messages, { role: 'ai', content: 'Mình đã tạo lại toàn bộ lịch trình cho bạn rồi nhé!' }]);
        } catch (err) {
          console.error(err);
          alert('Lỗi khi tạo lịch trình AI.');
        } finally {
          setIsChatting(false);
        }
      }
    });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const history = messages.filter(m => m.content !== 'Đang suy nghĩ...');
      const res = await api.post(`/Itinerary/ChatAi/${selectedTripId}`, { 
        message: userMessage,
        history: history 
      });
      const { reply, items: newItems } = res.data;
      
      setMessages(prev => [...prev, { role: 'ai', content: reply || 'Đã cập nhật lịch trình theo yêu cầu của bạn.' }]);
      setItems(newItems);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const updateItemStatus = async (item, newStatus) => {
    if (newStatus !== 'Chưa bắt đầu' && item.transport === 'Vui lòng chọn dịch vụ') {
      setConfirmDialog({ 
        isOpen: true, 
        message: 'Vui lòng chọn dịch vụ di chuyển trước khi lưu chặng này!', 
        onConfirm: null, 
        type: 'alert' 
      });
      return;
    }
    
    try {
      const updated = { ...item, status: newStatus };
      await api.put(`/Itinerary/${item.id}`, updated);
      setItems(items.map(i => i.id === item.id ? updated : i));

      // Tự động chuyển qua trang Chi phí kèm theo tên các dịch vụ
      if (newStatus === 'Đã chuẩn bị') {
        const services = [];
        if (item.transport && item.transport !== 'Vui lòng chọn dịch vụ') {
            services.push(item.transport);
        }
        if (item.notes) {
            const lines = item.notes.split('\n');
            lines.forEach(line => {
                if (line.includes(': ')) {
                    const parts = line.split(': ');
                    if (parts.length === 2) {
                        services.push(parts[1].trim());
                    }
                }
            });
        }
        
        if (services.length === 0) {
            services.push(formatItemTitle(item.title));
        }

        navigate(`/budget?tripId=${selectedTripId}&autoExpenses=${encodeURIComponent(JSON.stringify(services))}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTrip = (t) => {
    setSelectedTripId(t.id);
    localStorage.setItem('currentTripId', t.id);
  };

  const handleLoginGemini = () => {
    // Giả lập đăng nhập thành công
    localStorage.setItem('geminiConnected', 'true');
    setIsGeminiConnected(true);
    setMessages([{ role: 'ai', content: 'Đăng nhập thành công! Mình là Gemini, mình đã sẵn sàng giúp bạn lên lịch trình.' }]);
  };

  const handleLogoutGemini = () => {
    localStorage.removeItem('geminiConnected');
    setIsGeminiConnected(false);
    setMessages([{ role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }]);
  };

  const handleBack = () => {
    setSelectedTripId(null);
    setTrip(null);
    localStorage.removeItem('currentTripId');
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  if (!selectedTripId || !trip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quản lý lịch trình</h1>
            <p className="page-subtitle">Chọn một chuyến đi để xem và chỉnh sửa lịch trình chi tiết.</p>
          </div>
        </div>
        
        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
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
                    + Mở lịch trình chi tiết
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    const dateStr = new Date(item.startTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {formatItemTitle(trip.title)}
        </button>
      </div>

      {/* Removed page-header to save space */}

      <div className="wizard-steps-container">
        <div className="wizard-steps">
          <div className="step active">
            <div className="step-circle">1</div>
            <div className="step-info">
              <div className="step-title">Lịch trình</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/explore?tripId=${selectedTripId}`)}>
            <div className="step-circle">2</div>
            <div className="step-info">
              <div className="step-title">Khám phá & Dịch vụ</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/budget?tripId=${selectedTripId}`)}>
            <div className="step-circle">3</div>
            <div className="step-info">
              <div className="step-title">Chi phí nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/collaborate?tripId=${selectedTripId}`)}>
            <div className="step-circle">4</div>
            <div className="step-info">
              <div className="step-title">Cộng tác nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents?tripId=${selectedTripId}`)}>
            <div className="step-circle">5</div>
            <div className="step-info">
              <div className="step-title">Trạng thái</div>
            </div>
          </div>
        </div>
      </div>


      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 500, padding: 32, borderRadius: 24, background: '#fff'}}>
            <h2 style={{ marginBottom: 24, fontSize: 24, color: 'var(--color-primary-dark)' }}>Thêm hoạt động mới</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Tiêu đề</label>
                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Địa điểm</label>
                <input type="text" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                <div className="form-group" style={{width: '100%'}}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Bắt đầu (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.startTime} onChange={e => setNewItem({...newItem, startTime: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                </div>
                <div className="form-group" style={{width: '100%'}}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Kết thúc (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.endTime} onChange={e => setNewItem({...newItem, endTime: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Ghi chú</label>
                <textarea rows="3" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', resize: 'vertical' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'}></textarea>
              </div>
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="split-layout">
        {/* Left pane: AI Chat */}
        <div className="chat-container">
          <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              {isGeminiConnected ? 'Gemini AI' : 'Trợ lý Lịch trình AI'}
            </span>
            {isGeminiConnected ? (
              <button 
                onClick={handleLogoutGemini}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            ) : null}
          </div>
          
          {!isGeminiConnected ? (
            <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <h3 style={{ marginBottom: 12 }}>Kết nối với Gemini</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Đăng nhập để sử dụng sức mạnh của Google Gemini cho chuyến đi của bạn.</p>
              <button className="btn-primary" onClick={handleLoginGemini}>
                Đăng nhập với Google
              </button>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((m, idx) => (
                  <div key={idx} className={`chat-bubble ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                {isChatting && (
                  <div className="chat-bubble ai">
                    Đang suy nghĩ...
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <button className="btn-explore-sm" onClick={handleGenerateAi} disabled={isChatting}>
                    🔄 Tạo mới toàn bộ lịch trình
                  </button>
                </div>
              </div>
              <div className="chat-input-area">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Ví dụ: Đổi lịch chiều ngày 2 thành đi ăn ốc..." 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isChatting}
                />
                <button className="btn-send" onClick={handleSendMessage} disabled={isChatting || !chatInput.trim()}>Gửi</button>
              </div>
            </>
          )}
        </div>

        {/* Right pane: Timeline Layout */}
        <div className="timeline-container">
          {items.length === 0 ? (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Thêm Hoạt động</button>
              </div>
              <div style={{textAlign: 'center', padding: 60, background: 'transparent', border: '2px dashed #E5ECEB', borderRadius: 24}}>
                <div style={{fontSize: 48, marginBottom: 16}}>🗺️</div>
                <h3 style={{fontSize: 20, color: '#122B29', marginBottom: 8}}>Chưa có hoạt động nào</h3>
                <p style={{color: '#6E807F', marginBottom: 24}}>Bấm "Thêm Hoạt động" hoặc dùng Trợ lý AI để bắt đầu lên kế hoạch cho chuyến đi của bạn.</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedItems).map(([date, dayItems], groupIndex) => {
              const totalDays = Object.keys(groupedItems).length;
              let dayTitle = `Khám phá ${getShortLocation(trip.destination)}`;
              if (groupIndex === 0) {
                dayTitle = `Từ ${getShortLocation(trip.origin)} đi ${getShortLocation(trip.destination)}`;
              } else if (groupIndex === totalDays - 1) {
                dayTitle = `Từ ${getShortLocation(trip.destination)} về ${getShortLocation(trip.origin)}`;
              }

              return (
                <div key={date} className="timeline-date-group">
                  <div className="timeline-date-header">
                    <div>
                      <h3 className="timeline-date-title">{dayTitle}</h3>
                      <div style={{ fontSize: '14px', color: '#6E807F', marginTop: '6px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                        Ngày: {date}
                      </div>
                    </div>
                    {groupIndex === 0 && (
                      <button className="btn-add-activity" onClick={() => setShowAddForm(true)}>
                        + Thêm Hoạt động
                      </button>
                    )}
                  </div>
                
                <div className="timeline-list">
                  {dayItems.map((item, index) => {
                    return (
                      <div key={item.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="itinerary-card">
                            <div className="itinerary-card-header">
                              <div className="itinerary-time">
                                {new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} 
                                {item.endTime && item.endTime !== item.startTime ? ` - ${new Date(item.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}` : ''}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button 
                                  className={(!item.status || item.status === 'Chưa bắt đầu') ? 'btn-primary' : 'btn-secondary'} 
                                  style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px' }}
                                  onClick={async () => {
                                    if (!item.status || item.status === 'Chưa bắt đầu') {
                                      await updateItemStatus(item, 'Đã chuẩn bị');
                                    }
                                  }}
                                >
                                  {(!item.status || item.status === 'Chưa bắt đầu') ? 'Lưu' : 'Đã lưu'}
                                </button>
                                <button 
                                  className="btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '50%', minWidth: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => {
                                    setMessages(prev => [...prev, { role: 'ai', content: `Bạn muốn thay đổi gì ở giai đoạn "${formatItemTitle(item.title)}"?` }]);
                                    setTimeout(() => {
                                      const input = document.querySelector('.chat-input');
                                      if(input) input.focus();
                                    }, 100);
                                  }}
                                  title="Hỏi AI"
                                >
                                  ?
                                </button>
                                <button 
                                  className="btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '50%', minWidth: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => {
                                    setSelectedInfoItem(item);
                                  }}
                                  title="Xem thông tin chi tiết"
                                >
                                  i
                                </button>
                                <button className="btn-delete-icon" onClick={() => handleDelete(item.id)} title="Xóa">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </div>
                            </div>

                          <div className="itinerary-card-body">
                            <h4 className="itinerary-card-title">{formatItemTitle(item.title)}</h4>
                          </div>

                          <div className="itinerary-card-footer">
                            <div className="itinerary-services">
                              {item.location && (
                                <button className="service-btn map-btn" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${getMapQuery(item)}`, '_blank')}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                  Bản đồ
                                </button>
                              )}
                              <button className="service-btn" onClick={() => navigate(`/explore?tripId=${selectedTripId}&category=Di chuyển&itemId=${item.id}&search=${encodeURIComponent(item.location)}`)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v9c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
                                Di chuyển
                              </button>
                              <button className="service-btn" onClick={() => navigate(`/explore?tripId=${selectedTripId}&category=Lưu trú&itemId=${item.id}&search=${encodeURIComponent(item.location)}`)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                                Lưu trú
                              </button>
                              <button className="service-btn" onClick={() => navigate(`/explore?tripId=${selectedTripId}&category=Ăn uống&itemId=${item.id}&search=${encodeURIComponent(item.location)}`)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
                                Ăn uống
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {selectedInfoItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{maxWidth: 400, padding: '32px', borderRadius: '24px', background: '#fff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--color-primary-dark)' }}>Thông tin chi tiết</h2>
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <p style={{ marginBottom: '8px' }}><strong>Tên hoạt động/Dịch vụ:</strong> <br/>{formatItemTitle(selectedInfoItem.title)}</p>
              <p style={{ marginBottom: '8px' }}><strong>Điểm đi:</strong> <br/>{getShortLocation(selectedInfoItem.location)}</p>
              <p style={{ marginBottom: '8px' }}><strong>Điểm đến:</strong> <br/>{selectedInfoItem.destination ? getShortLocation(selectedInfoItem.destination) : 'Vui lòng chọn dịch vụ'}</p>
              {selectedInfoItem.transport && <p style={{ marginBottom: '8px' }}><strong>Di chuyển:</strong> <br/>{selectedInfoItem.transport}</p>}
              {selectedInfoItem.notes && <p style={{ marginBottom: '8px' }}><strong>Ghi chú:</strong> <br/>{selectedInfoItem.notes}</p>}
            </div>
            <button className="btn-primary" onClick={() => setSelectedInfoItem(null)}>Đóng</button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{maxWidth: 400, padding: '32px', borderRadius: '24px', background: '#fff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--color-primary-dark)' }}>
              {confirmDialog.type === 'alert' ? 'Thông báo' : 'Xác nhận'}
            </h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '16px', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {confirmDialog.type === 'alert' ? (
                <button className="btn-primary" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, type: 'confirm' })}>Đóng</button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, type: 'confirm' })}>Hủy</button>
                  <button className="btn-primary" style={{ backgroundColor: '#ef4444' }} onClick={confirmDialog.onConfirm}>Đồng ý</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryPage;
