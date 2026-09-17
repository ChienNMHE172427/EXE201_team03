import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ItineraryPage.css';

const ItineraryPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For adding new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu'
  });
  // Chat AI
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
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
    fetchTrips();
  }, []);

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
    }
  }, [selectedTripId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;
    try {
      const res = await api.post(`/Itinerary/${selectedTripId}`, newItem);
      setItems([...items, res.data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setShowAddForm(false);
      setNewItem({ title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu' });
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi thêm hoạt động.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa hoạt động này?')) return;
    try {
      await api.delete(`/Itinerary/${id}`);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa.');
    }
  };

  const handleGenerateAi = async () => {
    if (!window.confirm('Hành động này sẽ XÓA TOÀN BỘ lịch trình hiện tại và thay thế bằng lịch trình do AI gợi ý. Bạn có chắc chắn?')) return;
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
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await api.post(`/Itinerary/ChatAi/${selectedTripId}`, { message: userMessage });
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
    try {
      const updated = { ...item, status: newStatus };
      await api.put(`/Itinerary/${item.id}`, updated);
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTrip = (t) => {
    setSelectedTripId(t.id);
  };

  const handleBack = () => {
    setSelectedTripId(null);
    setTrip(null);
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
                    👥 Nhóm: {t.numberOfParticipants || 1} người <br/>
                    📍 Điểm đến: {t.destination}
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
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Lịch trình
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch trình: {trip.title}</h1>
          <p className="page-subtitle">Điểm đến: {trip.destination}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            + Thêm Hoạt động
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 500}}>
            <h2>Thêm hoạt động mới</h2>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label>Tiêu đề</label>
                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Địa điểm</label>
                <input type="text" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} required />
              </div>
              <div style={{display: 'flex', gap: 16}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>Bắt đầu (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.startTime} onChange={e => setNewItem({...newItem, startTime: e.target.value})} required />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Kết thúc (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.endTime} onChange={e => setNewItem({...newItem, endTime: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <textarea rows="3" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}></textarea>
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
          <div className="chat-header">
            ✨ Trợ lý Lịch trình AI
          </div>
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
        </div>

        {/* Right pane: Itinerary Table */}
        <div className="itinerary-table-container">
          {items.length === 0 ? (
            <div style={{textAlign: 'center', padding: 40, background: '#fff', borderRadius: 16}}>
              <h3>Lịch trình trống</h3>
              <p style={{color: '#666', marginTop: 12}}>Bấm "Thêm Hoạt động" hoặc dùng AI để bắt đầu lên kế hoạch cho chuyến đi của bạn.</p>
            </div>
          ) : (
            <table className="itinerary-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Thời gian</th>
                  <th>Phương tiện</th>
                  <th>Từ - Đến (Mô tả)</th>
                  <th>Người phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedItems).map(([date, dayItems], groupIndex) => (
                  <React.Fragment key={date}>
                    {dayItems.map((item, index) => {
                      const statusClass = item.status === 'Đã hoàn thành' ? 'status-da-hoan-thanh' : item.status === 'Đã chuẩn bị' ? 'status-da-chuan-bi' : 'status-chua-bat-dau';
                      return (
                        <tr key={item.id}>
                          {index === 0 && (
                            <td rowSpan={dayItems.length} className="date-cell">
                              {date}
                            </td>
                          )}
                          <td>
                            {new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} 
                            {item.endTime && item.endTime !== item.startTime ? ` - ${new Date(item.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}` : ''}
                          </td>
                          <td>{item.transport || '-'}</td>
                          <td>
                            <strong>{item.title}</strong>
                            {item.location && <div style={{ fontSize: 12, color: '#666' }}>📍 {item.location}</div>}
                          </td>
                          <td>{item.assignee || 'Trống'}</td>
                          <td>
                            <select 
                              value={item.status || 'Chưa bắt đầu'} 
                              onChange={(e) => updateItemStatus(item, e.target.value)}
                              className={`status-badge ${statusClass}`}
                              style={{ border: 'none', outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="Chưa bắt đầu" className="status-chua-bat-dau">Chưa bắt đầu</option>
                              <option value="Đã chuẩn bị" className="status-da-chuan-bi">Đã chuẩn bị</option>
                              <option value="Đã hoàn thành" className="status-da-hoan-thanh">Đã hoàn thành</option>
                            </select>
                          </td>
                          <td>
                            <div className="action-buttons" style={{ flexDirection: 'column' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-explore-sm" onClick={() => navigate(`/explore?tripId=${selectedTripId}&category=Di chuyển`)}>Tìm Xe</button>
                                <button className="btn-explore-sm" onClick={() => navigate(`/explore?tripId=${selectedTripId}&category=Lưu trú`)}>Tìm KS</button>
                              </div>
                              <button className="btn-danger-sm" style={{ padding: '4px 8px', width: '100%' }} onClick={() => handleDelete(item.id)}>Xóa</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItineraryPage;
