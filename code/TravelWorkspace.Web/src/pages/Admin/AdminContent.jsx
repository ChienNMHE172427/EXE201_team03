import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const AdminContent = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTrips = async () => {
    try {
      const res = await api.get('/admin/contents');
      setTrips(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const deleteTrip = async (id) => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc muốn xóa VĨNH VIỄN chuyến đi này cùng mọi dữ liệu liên quan?')) return;
    try {
      await api.delete(`/admin/contents/${id}`);
      fetchTrips();
    } catch (err) {
      alert('Lỗi khi xóa chuyến đi');
    }
  };

  const filteredTrips = trips.filter(trip => 
    trip.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (trip.ownerEmail && trip.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="admin-page">
      <div className="admin-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h2>Quản lý Nội dung (Chuyến đi)</h2>
      </div>

      <div style={{marginBottom: '20px'}}>
        <input 
          type="text" 
          placeholder="Tìm kiếm theo Tên chuyến đi hoặc Email chủ sở hữu..." 
          style={{padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', maxWidth: '400px'}}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Chuyến Đi</th>
              <th>Chủ Sở Hữu (Email)</th>
              <th>Địa Điểm</th>
              <th>Ngày Đi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Đang tải...</td></tr>
            ) : filteredTrips.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Không tìm thấy chuyến đi nào.</td></tr>
            ) : (
              filteredTrips.map(trip => (
                <tr key={trip.id}>
                  <td>{trip.id}</td>
                  <td style={{fontWeight: 'bold'}}>{trip.title}</td>
                  <td>{trip.ownerEmail || 'N/A'}</td>
                  <td>{trip.destination}</td>
                  <td>{new Date(trip.startDate).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button className="btn-action edit" onClick={() => window.open(`/itinerary?tripId=${trip.id}`, '_blank')}>Xem</button>
                    <button className="btn-action delete" onClick={() => deleteTrip(trip.id)}>Xóa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminContent;
