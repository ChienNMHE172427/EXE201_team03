import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };
    loadUser();

    window.addEventListener('profileUpdated', loadUser);
    return () => window.removeEventListener('profileUpdated', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentTripId');
    window.location.href = '/login';
  };

  const handleNavClick = (e, path) => {
    if (window.location.pathname === path) {
      localStorage.removeItem('currentTripId');
      window.location.reload();
    }
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div>
        <div className="sidebar-logo">Travel Workspace</div>
        <div className="sidebar-subtitle">Quản lý chuyến đi</div>
      </div>

      <div className="sidebar-nav" style={{ flex: 1 }}>
        <NavLink to="/dashboard" onClick={(e) => handleNavClick(e, '/dashboard')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Chuyến đi của tôi
        </NavLink>
        <NavLink to="/create-trip" onClick={(e) => handleNavClick(e, '/create-trip')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Tạo chuyến đi
        </NavLink>
        <NavLink to="/itinerary" onClick={(e) => handleNavClick(e, '/itinerary')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Lịch trình
        </NavLink>
        <NavLink to="/explore" onClick={(e) => handleNavClick(e, '/explore')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Khám phá & đặt dịch vụ
        </NavLink>
        <NavLink to="/budget" onClick={(e) => handleNavClick(e, '/budget')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Chi phí nhóm
        </NavLink>
        <NavLink to="/documents" onClick={(e) => handleNavClick(e, '/documents')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Trạng thái
        </NavLink>
        <NavLink to="/collaborate" onClick={(e) => handleNavClick(e, '/collaborate')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Cộng tác nhóm
        </NavLink>
        <NavLink to="/companions" onClick={(e) => handleNavClick(e, '/companions')} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          Bạn đồng hành
        </NavLink>
      </div>

      <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar">{user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}</div>
            )}
            <div className="user-info">
              <span className="user-name" style={{ cursor: 'pointer' }}>{user?.name || 'Tài khoản'}</span>
              <span className="user-role">{user?.role || 'Đang đăng nhập'}</span>
            </div>
          </NavLink>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', transition: '0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#fff'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
