import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './CollaboratePage.css';

const CollaboratePage = () => {
  const [trip, setTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [newTodo, setNewTodo] = useState('');
  
  const messagesEndRef = useRef(null);
  const tripId = localStorage.getItem('currentTripId');
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    fetchData();
    // In a real app, you would use SignalR or WebSockets here for realtime
    // For now, we will poll every 5 seconds
    const interval = setInterval(() => {
      if (tripId) {
        fetchMessages(false);
        fetchTodos(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async () => {
    try {
      if (!tripId) return;
      
      const tripRes = await api.get(`/Trip/${tripId}`);
      setTrip(tripRes.data);
      
      await fetchMessages(true);
      await fetchTodos(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (showLoading = true) => {
    try {
      const res = await api.get(`/Collaborate/messages/${tripId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodos = async (showLoading = true) => {
    try {
      const res = await api.get(`/Collaborate/todos/${tripId}`);
      setTodos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await api.post(`/Collaborate/messages/${tripId}`, { content: newMessage });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    try {
      const res = await api.post(`/Collaborate/todos/${tripId}`, { title: newTodo });
      setTodos([res.data, ...todos]);
      setNewTodo('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTodo = async (id) => {
    try {
      // Optimistic update
      setTodos(todos.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
      await api.put(`/Collaborate/todos/${id}/toggle`);
      fetchTodos(false);
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

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;
  if (!trip) return <div className="page-container"><h2 style={{marginTop: 40}}>Chưa có chuyến đi nào được chọn.</h2></div>;

  return (
    <div className="page-container collab-container">
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
