import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import './ItineraryPage.css';

const ItineraryPage = () => {
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For adding new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '', location: '', notes: '', startTime: '', endTime: ''
  });

  const tripId = localStorage.getItem('currentTripId');

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      if (!tripId) return setLoading(false);
      
      const tripRes = await api.get(`/Trip/${tripId}`);
      setTrip(tripRes.data);

      const itemsRes = await api.get(`/Itinerary/${tripId}`);
      setItems(itemsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/Itinerary/${tripId}`, newItem);
      setItems([...items, res.data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setShowAddForm(false);
      setNewItem({ title: '', location: '', notes: '', startTime: '', endTime: '' });
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

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;
  if (!trip) return <div className="page-container"><h2 style={{marginTop: 40}}>Chưa có chuyến đi nào được chọn.</h2></div>;

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    const dateStr = new Date(item.startTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch trình: {trip.title}</h1>
          <p className="page-subtitle">Điểm đến: {trip.destination}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + Thêm Hoạt động
        </button>
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

      <div className="itinerary-timeline">
        {Object.keys(groupedItems).length === 0 ? (
          <div style={{textAlign: 'center', padding: 40, background: '#fff', borderRadius: 16}}>
            <h3>Lịch trình trống</h3>
            <p style={{color: '#666', marginTop: 12}}>Bấm "Thêm Hoạt động" để bắt đầu lên kế hoạch cho chuyến đi của bạn.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([date, dayItems]) => (
            <div key={date} className="timeline-day">
              <h2 className="timeline-date">{date}</h2>
              <div className="timeline-items">
                {dayItems.map(item => (
                  <div key={item.id} className="timeline-item">
                    <div className="timeline-time">
                      {new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="timeline-card">
                      <div className="timeline-card-header">
                        <h3>{item.title}</h3>
                        <button onClick={() => handleDelete(item.id)} className="btn-danger-sm">Xóa</button>
                      </div>
                      <p className="timeline-location">📍 {item.location}</p>
                      {item.notes && <p className="timeline-notes">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ItineraryPage;
