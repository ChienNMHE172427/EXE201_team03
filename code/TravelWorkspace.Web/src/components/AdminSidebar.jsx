import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ReactGA from 'react-ga4';

const AdminSidebar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    ReactGA.set({ user_id: null });
    window.location.href = '/';
  };

  return (
    <>
      {/* Thanh Topbar Admin chỉ hiển thị trên Điện thoại (<= 768px) */}
      <div className="mobile-topbar admin-mobile-topbar">
        <div className="mobile-topbar-brand" style={{ color: '#ff6b6b' }}>Admin Panel</div>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Mở menu quản trị"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a2e' }}>
        <div>
          <div className="sidebar-logo" style={{ color: '#ff6b6b' }}>Admin Panel</div>
          <div className="sidebar-subtitle">Hệ thống Quản trị</div>
        </div>

        <div className="sidebar-nav" style={{ flex: 1, marginTop: '20px' }}>
          <NavLink to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            Tổng quan hệ thống
          </NavLink>
          <NavLink to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            Quản lý người dùng
          </NavLink>
          <NavLink to="/admin/partners" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            Quản lý đối tác
          </NavLink>
          <NavLink to="/admin/affiliate-services" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            Affiliate theo khu vực
          </NavLink>
          <NavLink to="/admin/content" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
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
    </>
  );
};

export default AdminSidebar;
