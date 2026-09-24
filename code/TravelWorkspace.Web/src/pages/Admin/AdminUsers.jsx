import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');

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
    
    try {
      await api.put(`/admin/users/${user.id}/toggle-status`, {});
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái.');
    }
  };

  const deleteUser = async (id, currentRole) => {
    if (currentRole === 'Admin') {
      alert('Không thể xóa tài khoản Admin!');
      return;
    }
    
    if (!window.confirm('Bạn có chắc muốn XÓA vĩnh viễn tài khoản này?')) {
        return;
    }
    
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert('Lỗi khi xóa người dùng.');
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
                          onClick={() => deleteUser(user.id, user.role)}
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
    </div>
  );
};

export default AdminUsers;
