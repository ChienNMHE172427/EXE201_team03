import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const AdminPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', category: 'Flight', searchUrlTemplate: '' });

  const fetchPartners = async () => {
    try {
      const res = await api.get('/admin/partners');
      setPartners(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const deletePartner = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa đối tác này?')) return;
    try {
      await api.delete(`/admin/partners/${id}`);
      fetchPartners();
    } catch (err) {
      alert('Lỗi khi xóa đối tác');
    }
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/partners', newPartner);
      setNewPartner({ name: '', category: 'Flight', searchUrlTemplate: '' });
      setShowAddForm(false);
      fetchPartners();
    } catch (err) {
      alert('Lỗi khi thêm đối tác');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h2>Quản lý Đối tác Affiliate</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Hủy' : '+ Thêm Đối tác'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddPartner} style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
          <div style={{flex: 1}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold'}}>Tên Đối Tác</label>
            <input required style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} placeholder="Vd: Skyscanner" />
          </div>
          <div style={{flex: 1}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold'}}>Danh Mục</label>
            <select style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} value={newPartner.category} onChange={e => setNewPartner({...newPartner, category: e.target.value})}>
              <option value="Flight">Chuyến bay</option>
              <option value="Hotel">Khách sạn</option>
            </select>
          </div>
          <div style={{flex: 2}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold'}}>URL Template (dùng {'{destination}'})</label>
            <input required style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} value={newPartner.searchUrlTemplate} onChange={e => setNewPartner({...newPartner, searchUrlTemplate: e.target.value})} placeholder="Vd: https://agoda.com/search?q={destination}" />
          </div>
          <button type="submit" className="btn-primary" style={{padding: '8px 16px', height: '37px'}}>Lưu</button>
        </form>
      )}
      
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Đối Tác</th>
              <th>Danh Mục</th>
              <th>Số Click</th>
              <th>Trạng Thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Chưa có đối tác nào.</td></tr>
            ) : (
              partners.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{fontWeight: 'bold'}}>{p.name}</td>
                  <td><span className={`role-badge ${p.category === 'Flight' ? 'admin' : 'traveler'}`}>{p.category}</span></td>
                  <td>{p.clicks}</td>
                  <td>
                    <span style={{color: p.isActive ? 'green' : 'red', fontWeight: 'bold'}}>
                      {p.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-action edit" onClick={() => alert('Sửa URL: ' + p.searchUrlTemplate)}>Sửa</button>
                    <button className="btn-action delete" onClick={() => deletePartner(p.id)}>Xóa</button>
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

export default AdminPartners;
