import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a2e' }}>
      <div>
        <div className="sidebar-logo" style={{ color: '#ff6b6b' }}>Admin Panel</div>
        <div className="sidebar-subtitle">Hệ thống Quản trị</div>
      </div>

      <div className="sidebar-nav" style={{ flex: 1, marginTop: '20px' }}>
        <NavLink to="/admin/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Tổng quan hệ thống
        </NavLink>
        <NavLink to="/admin/users" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Quản lý người dùng
        </NavLink>
        <NavLink to="/admin/partners" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Quản lý đối tác
        </NavLink>
        <NavLink to="/admin/content" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Quản lý nội dung
        </NavLink>
      </div>

      <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar" style={{ backgroundColor: '#ff6b6b' }}>AD</div>
          <div className="user-info">
            <span className="user-name">Quản trị viên</span>
            <span className="user-role" style={{ color: '#ff6b6b' }}>Toàn quyền</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', transition: '0.2s' }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
