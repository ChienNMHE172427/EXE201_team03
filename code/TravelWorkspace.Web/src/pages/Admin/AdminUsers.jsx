import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const toggleUserStatus = async (id, currentRole) => {
    if (currentRole === 'Admin') {
      alert('Không thể khóa tài khoản Admin!');
      return;
    }
    
    try {
      await api.put(`/admin/users/${id}/toggle-status`);
      // Refresh list
      fetchUsers();
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái.');
    }
  };

  if (loading) return <div className="admin-page">Đang tải dữ liệu...</div>;

  return (
    <div className="admin-page">
      <h2>Quản lý người dùng</h2>
      {error && <div className="error-message" style={{color: 'red', marginBottom: '20px'}}>{error}</div>}
      
      {!error && (
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
              {users.map(user => (
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
                      onClick={() => toggleUserStatus(user.id, user.role)}
                    >
                      {user.isActive ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
