import React, { useState, useEffect } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  // State quản lý Modal xác nhận xóa
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setError('Bạn không có quyền truy cập dữ liệu này (Lỗi 403 Forbidden).');
      } else {
        setError('Lỗi khi tải danh sách người dùng.');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (user) => {
    if (user.role === 'Admin') {
      alert('Không thể khóa tài khoản Admin!');
      return;
    }
    
    const action = user.isActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản này không?`)) {
      return;
    }
    
    try {
      await api.put(`/admin/users/${user.id}/toggle-status`, { reason: `Yêu cầu ${action} từ quản trị viên` });
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái.');
    }
  };

  const openDeleteModal = (user) => {
    if (user.role === 'Admin') {
      alert('Không thể xóa tài khoản Admin!');
      return;
    }
    setDeleteModal({ isOpen: true, user });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/users/${deleteModal.user.id}`);
      setUsers(users.filter(u => u.id !== deleteModal.user.id));
      setDeleteModal({ isOpen: false, user: null });
    } catch (err) {
      alert('Lỗi khi xóa người dùng.');
    } finally {
      setDeleting(false);
    }
  };

  const promoteUser = async (id, currentRole) => {
    if (currentRole === 'Admin') return;
    if (!window.confirm('Bạn có chắc muốn thăng cấp người dùng này thành Admin?')) return;

    try {
      await api.put(`/admin/users/${id}/promote`);
      fetchUsers();
    } catch (err) {
      alert('Lỗi khi thăng quyền.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) return <div className="admin-page">Đang tải dữ liệu...</div>;

  return (
    <div className="admin-page">
      <h2>Quản lý người dùng</h2>
      {error && <div className="error-message" style={{color: 'red', marginBottom: '20px'}}>{error}</div>}
      
      {!error && (
        <>
          <div style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
            <input 
              type="text" 
              placeholder="Tìm kiếm email hoặc tên..." 
              style={{padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              style={{padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc'}}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="All">Tất cả vai trò</option>
              <option value="Traveler">Traveler</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span style={{color: user.isActive ? 'green' : 'red', fontWeight: 'bold'}}>
                      {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button 
                      className={`btn-action ${user.isActive ? 'delete' : 'edit'}`}
                      onClick={() => toggleUserStatus(user)}
                      disabled={user.role === 'Admin'}
                      style={{ opacity: user.role === 'Admin' ? 0.5 : 1, marginRight: '8px' }}
                    >
                      {user.isActive ? 'Khóa' : 'Mở khóa'}
                    </button>
                    {user.role !== 'Admin' && (
                      <>
                        <button 
                          className="btn-action edit"
                          onClick={() => promoteUser(user.id, user.role)}
                          style={{ marginRight: '8px' }}
                        >
                          Lên Admin
                        </button>
                        <button 
                          className="btn-action delete"
                          onClick={() => openDeleteModal(user)}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modal xác nhận xóa người dùng với UI đẹp mắt */}
      {deleteModal.isOpen && deleteModal.user && (
        <div className="admin-modal-backdrop" onClick={() => !deleting && setDeleteModal({ isOpen: false, user: null })}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-modal-icon-danger">
                <Trash2 size={22} color="#dc2626" />
              </div>
              <div className="admin-modal-header-text">
                <h3 className="admin-modal-title">Xác nhận xóa tài khoản</h3>
                <p className="admin-modal-subtitle">Hành động này sẽ xóa người dùng khỏi hệ thống</p>
              </div>
              <button 
                className="admin-modal-close-btn"
                onClick={() => !deleting && setDeleteModal({ isOpen: false, user: null })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: 0 }}>Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản sau không?</p>
              <div className="admin-modal-user-info">
                <div className="admin-modal-user-item">
                  <span>Họ và tên:</span>
                  <strong>{deleteModal.user.fullName || 'Chưa cập nhật'}</strong>
                </div>
                <div className="admin-modal-user-item">
                  <span>Email:</span>
                  <strong>{deleteModal.user.email}</strong>
                </div>
                <div className="admin-modal-user-item">
                  <span>Vai trò:</span>
                  <strong>{deleteModal.user.role}</strong>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button 
                type="button"
                className="admin-btn-secondary" 
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                disabled={deleting}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                className="admin-btn-danger" 
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
