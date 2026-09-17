import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './CollaboratePage.css';

const CollaboratePage = () => {
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [trip, setTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [newTodo, setNewTodo] = useState('');
  
  const messagesEndRef = useRef(null);
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

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

  useEffect(() => {
    if (selectedTripId) {
      fetchData(selectedTripId);
      const interval = setInterval(() => {
        fetchMessages(selectedTripId, false);
        fetchTodos(selectedTripId, false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTripId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async (id) => {
    try {
      const tripRes = await api.get(`/Trip/${id}`);
      setTrip(tripRes.data);
      
      await fetchMessages(id, true);
      await fetchTodos(id, true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (id, showLoading = true) => {
    try {
      const res = await api.get(`/Collaborate/messages/${id}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodos = async (id, showLoading = true) => {
    try {
      const res = await api.get(`/Collaborate/todos/${id}`);
      setTodos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTripId) return;
    try {
      const res = await api.post(`/Collaborate/messages/${selectedTripId}`, { content: newMessage });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim() || !selectedTripId) return;
    try {
      const res = await api.post(`/Collaborate/todos/${selectedTripId}`, { title: newTodo });
      setTodos([res.data, ...todos]);
      setNewTodo('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTodo = async (id) => {
    try {
      setTodos(todos.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
      await api.put(`/Collaborate/todos/${id}/toggle`);
      if (selectedTripId) fetchTodos(selectedTripId, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!window.confirm('Xóa công việc này?')) return;
    try {
      await api.delete(`/Collaborate/todos/${id}`);
      setTodos(todos.filter(t => t.id !== id));
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
            <h1 className="page-title">Cộng tác nhóm</h1>
            <p className="page-subtitle">Chọn một lịch trình để thảo luận và phân chia công việc.</p>
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
                    + Mở không gian cộng tác
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container collab-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          ← Quay lại danh sách Lịch trình
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Cộng tác: {trip.title}</h1>
          <p className="page-subtitle">Thảo luận và phân chia công việc với các thành viên khác</p>
        </div>
      </div>

      <div className="collab-grid">
        {/* Chat Section */}
        <div className="collab-chat-section">
          <div className="section-header">
            <h3>💬 Bảng Thảo Luận</h3>
          </div>
          
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">Chưa có tin nhắn nào. Hãy gửi lời chào đến mọi người!</div>
            ) : (
              messages.map(msg => {
                const isMe = msg.userId === currentUserId;
                return (
                  <div key={msg.id} className={`chat-message ${isMe ? 'message-mine' : 'message-other'}`}>
                    {!isMe && <div className="message-sender">{msg.userName}</div>}
                    <div className="message-bubble">{msg.content}</div>
                    <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Nhập tin nhắn..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={!newMessage.trim()}>Gửi</button>
          </form>
        </div>

        {/* Todo Section */}
        <div className="collab-todo-section">
          <div className="section-header">
            <h3>📋 Danh sách Cần làm chung</h3>
          </div>

          <form className="todo-input-area" onSubmit={handleAddTodo}>
            <input 
              type="text" 
              placeholder="Thêm công việc mới (VD: Đặt vé máy bay)..." 
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={!newTodo.trim()}>Thêm</button>
          </form>
          
          <div className="todo-list">
            {todos.length === 0 ? (
              <div className="empty-state">Chưa có công việc nào.</div>
            ) : (
              todos.map(todo => (
                <div key={todo.id} className={`todo-item ${todo.isCompleted ? 'completed' : ''}`}>
                  <label className="todo-checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={todo.isCompleted} 
                      onChange={() => handleToggleTodo(todo.id)} 
                    />
                    <span className="checkmark"></span>
                  </label>
                  <div className="todo-content">
                    <span className="todo-title">{todo.title}</span>
                  </div>
                  <button className="todo-delete-btn" onClick={() => handleDeleteTodo(todo.id)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratePage;
