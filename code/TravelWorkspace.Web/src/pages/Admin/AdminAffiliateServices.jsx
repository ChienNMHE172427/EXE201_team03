import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Bus, 
  MapPin, 
  Plus, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  Search, 
  X,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import './Admin.css';

const AdminAffiliateServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal thêm/sửa dịch vụ
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    region: '',
    destination: '',
    category: 'hotel',
    name: '',
    affiliateUrl: '',
    notes: '',
    isActive: true
  });

  // Modal thêm địa điểm mới vào khu vực
  const [showAddDestModal, setShowAddDestModal] = useState(false);
  const [newDestName, setNewDestName] = useState('');

  // Modal thêm khu vực mới
  const [showAddRegionModal, setShowAddRegionModal] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      let res = await api.get('/AffiliateService/admin/all');
      
      // Nếu API trả về mảng rỗng (thường gặp khi database online vừa khởi tạo), tự động kích hoạt nạp dữ liệu mẫu
      if (!res.data || res.data.length === 0) {
        try {
          await api.post('/AffiliateService/admin/reseed');
          res = await api.get('/AffiliateService/admin/all');
        } catch (seedErr) {
          console.warn('Tự động nạp dữ liệu mẫu ban đầu:', seedErr);
        }
      }

      const data = res.data || [];
      setServices(data);
      
      // Mặc định chọn khu vực đầu tiên nếu chưa chọn
      if (data.length > 0) {
        setSelectedRegion(prev => prev || data[0].region);
      }
    } catch (err) {
      console.error('Lỗi khi tải dịch vụ affiliate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    try {
      setSyncing(true);
      setSyncMessage('');
      const res = await api.post('/AffiliateService/admin/reseed');
      setSyncMessage(res.data?.message || 'Đồng bộ dữ liệu thành công!');
      await fetchServices();
    } catch (err) {
      console.error('Lỗi khi đồng bộ dữ liệu affiliate:', err);
      alert('Không thể đồng bộ tự động. Vui lòng kiểm tra kết nối API online.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Danh sách các khu vực duy nhất
  const uniqueRegions = Array.from(new Set(services.map(s => s.region))).filter(Boolean);

  // Lọc các dịch vụ theo khu vực đang chọn và từ khóa
  const filteredServices = services.filter(s => {
    const matchRegion = !selectedRegion || s.region === selectedRegion;
    const matchSearch = !searchTerm || 
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRegion && matchSearch;
  });

  // Nhóm theo Địa điểm (Destination) trong khu vực đang chọn
  const destinationsInRegion = Array.from(
    new Set(filteredServices.map(s => s.destination))
  ).filter(Boolean);

  // Mở modal thêm dịch vụ cho 1 địa điểm cụ thể
  const handleOpenAddService = (dest) => {
    setEditingServiceId(null);
    setServiceForm({
      region: selectedRegion,
      destination: dest,
      category: 'hotel',
      name: '',
      affiliateUrl: '',
      notes: '',
      isActive: true
    });
    setShowServiceModal(true);
  };

  // Mở modal sửa dịch vụ
  const handleOpenEditService = (item) => {
    setEditingServiceId(item.id);
    setServiceForm({
      region: item.region,
      destination: item.destination,
      category: item.category || 'hotel',
      name: item.name,
      affiliateUrl: item.affiliateUrl,
      notes: item.notes || '',
      isActive: item.isActive
    });
    setShowServiceModal(true);
  };

  // Lưu dịch vụ (Thêm mới hoặc Cập nhật)
  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (editingServiceId) {
        await api.put(`/AffiliateService/admin/${editingServiceId}`, serviceForm);
      } else {
        await api.post('/AffiliateService/admin', serviceForm);
      }
      setShowServiceModal(false);
      fetchServices();
    } catch (err) {
      alert('Lỗi khi lưu dịch vụ: ' + (err.response?.data?.message || err.message));
    }
  };

  // Xóa 1 dịch vụ
  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"?`)) return;
    try {
      await api.delete(`/AffiliateService/admin/${id}`);
      fetchServices();
    } catch (err) {
      alert('Lỗi khi xóa dịch vụ');
    }
  };

  // Thêm Địa điểm vui chơi mới vào khu vực hiện tại
  const handleCreateDestination = (e) => {
    e.preventDefault();
    if (!newDestName.trim()) return;
    const dest = newDestName.trim();
    setShowAddDestModal(false);
    setNewDestName('');
    handleOpenAddService(dest);
  };

  // Thêm Khu vực mới
  const handleCreateRegion = (e) => {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    const reg = newRegionName.trim();
    setSelectedRegion(reg);
    setShowAddRegionModal(false);
    setNewRegionName('');
    setShowAddDestModal(true);
  };

  // Xóa toàn bộ 1 địa điểm trong khu vực
  const handleDeleteDestination = async (dest) => {
    if (!window.confirm(`Bạn có chắc muốn xóa địa điểm "${dest}" và toàn bộ các dịch vụ liên kết của nó?`)) return;
    try {
      await api.post('/AffiliateService/admin/delete-destination', {
        region: selectedRegion,
        destination: dest
      });
      fetchServices();
    } catch (err) {
      alert('Lỗi khi xóa địa điểm');
    }
  };

  // Đổi tên địa điểm
  const handleRenameDestination = async (oldDest) => {
    const newName = window.prompt(`Nhập tên mới cho địa điểm "${oldDest}":`, oldDest);
    if (!newName || newName.trim() === oldDest) return;
    try {
      await api.post('/AffiliateService/admin/rename-destination', {
        region: selectedRegion,
        oldDestination: oldDest,
        newDestination: newName.trim()
      });
      fetchServices();
    } catch (err) {
      alert('Lỗi khi đổi tên địa điểm');
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>Quản lý Dịch vụ Affiliate theo Khu vực</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Quản lý địa điểm du lịch và liên kết affiliate (Cư trú & Nhà xe) cho từng tỉnh/thành.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={handleReseed}
            disabled={syncing}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              background: syncing ? '#94a3b8' : '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: syncing ? 'not-allowed' : 'pointer', 
              fontWeight: '600', 
              fontSize: '13px' 
            }}
            title="Đồng bộ nạp đầy đủ 44 dịch vụ affiliate mẫu cho 5 khu vực vào cơ sở dữ liệu"
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> 
            {syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Dữ Liệu Mẫu'}
          </button>
          <button 
            type="button" 
            onClick={() => setShowAddRegionModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            <Plus size={15} /> Thêm Khu Vực / Tỉnh
          </button>
          <button 
            type="button" 
            onClick={() => setShowAddDestModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            <Plus size={15} /> Thêm Địa Điểm Du Lịch
          </button>
        </div>
      </div>

      {/* Toast thông báo đồng bộ */}
      {syncMessage && (
        <div style={{ 
          background: '#ecfdf5', 
          border: '1px solid #a7f3d0', 
          color: '#065f46', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontWeight: '500',
          fontSize: '14px'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Bộ lọc Khu vực & Tìm kiếm */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={15} /> Khu vực / Tỉnh:
          </span>
          <select 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', fontWeight: '600' }}
          >
            {uniqueRegions.length === 0 ? (
              <option value="">Chưa có khu vực</option>
            ) : (
              uniqueRegions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))
            )}
          </select>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên địa điểm hoặc tên dịch vụ..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {searchTerm && (
          <button 
            type="button" 
            onClick={() => setSearchTerm('')}
            style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Xóa tìm
          </button>
        )}
      </div>

      {/* Nội dung danh sách theo từng Địa điểm trong Khu vực */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách dịch vụ...</div>
      ) : uniqueRegions.length === 0 ? (
        <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', textAlign: 'center', color: '#475569', border: '1px dashed #cbd5e1', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <RefreshCw size={26} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
            Chưa có dữ liệu Affiliate theo khu vực
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: '520px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
            Bản online vừa được khởi tạo cơ sở dữ liệu mới. Bạn có thể nhấn nút bên dưới để tự động nạp toàn bộ <strong>44 dịch vụ đối tác</strong> (khách sạn & nhà xe) chuẩn giống như bản local cho 5 tỉnh/thành: <em>Quảng Ninh, Lào Cai, Ninh Bình, Hà Giang, Cao Bằng</em>.
          </p>
          <button 
            type="button" 
            onClick={handleReseed}
            disabled={syncing}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 24px', 
              background: '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: syncing ? 'not-allowed' : 'pointer', 
              fontWeight: '600', 
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)' 
            }}
          >
            <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Đang nạp dữ liệu mẫu...' : 'Nạp Dữ Liệu Mẫu Ngay (Giống Bản Local)'}
          </button>
        </div>
      ) : destinationsInRegion.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
            Chưa có địa điểm hay dịch vụ nào trong khu vực <strong>{selectedRegion || 'được chọn'}</strong>.
          </p>
          <button 
            type="button" 
            onClick={() => setShowAddDestModal(true)}
            style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            + Thêm Địa Điểm Đầu Tiên
          </button>
        </div>
      ) : (
        destinationsInRegion.map(dest => {
          const destServices = filteredServices.filter(s => s.destination === dest);
          return (
            <div key={dest} style={{ background: 'white', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {/* Header Địa điểm */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color="#0284c7" />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{dest}</span>
                  <span style={{ fontSize: '12px', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '999px', fontWeight: '600' }}>
                    {destServices.length} dịch vụ
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => handleOpenAddService(dest)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  >
                    <Plus size={13} /> Thêm Dịch Vụ
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleRenameDestination(dest)}
                    style={{ padding: '6px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Sửa tên
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteDestination(dest)}
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Xóa địa điểm
                  </button>
                </div>
              </div>

              {/* Bảng Dịch Vụ (Đã bỏ cột Giá tham khảo theo yêu cầu) */}
              <table className="admin-table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px' }}>
                    <th style={{ width: '120px' }}>Loại</th>
                    <th>Tên Dịch Vụ</th>
                    <th>Link Tiếp Thị (Affiliate URL)</th>
                    <th>Ghi chú / Tiện ích</th>
                    <th style={{ width: '110px' }}>Trạng thái</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {destServices.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Chưa có dịch vụ nào cho địa điểm này. Bấm "+ Thêm Dịch Vụ" ở trên để liên kết.
                      </td>
                    </tr>
                  ) : (
                    destServices.map(item => (
                      <tr key={item.id} style={{ fontSize: '13px' }}>
                        <td>
                          {item.category === 'hotel' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: '600', fontSize: '11px' }}>
                              <Building size={12} /> Cư trú
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', fontWeight: '600', fontSize: '11px' }}>
                              <Bus size={12} /> Nhà xe
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>
                          {item.name}
                        </td>
                        <td>
                          <a 
                            href={item.affiliateUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', textDecoration: 'none', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={item.affiliateUrl}
                          >
                            <ExternalLink size={12} /> {item.affiliateUrl}
                          </a>
                        </td>
                        <td style={{ color: '#475569', fontSize: '12px' }}>
                          {item.notes || '---'}
                        </td>
                        <td>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: item.isActive ? '#dcfce7' : '#fee2e2', 
                            color: item.isActive ? '#15803d' : '#b91c1c' 
                          }}>
                            {item.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-action edit"
                            onClick={() => handleOpenEditService(item)}
                            style={{ marginRight: '6px', padding: '4px 10px', fontSize: '12px' }}
                          >
                            Sửa
                          </button>
                          <button 
                            type="button" 
                            className="btn-action delete"
                            onClick={() => handleDeleteService(item.id, item.name)}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      {/* MODAL 1: THÊM / SỬA DỊCH VỤ AFFILIATE (ĐÃ BỎ GIÁ THAM KHẢO & ĐỊA CHỈ ĐIỂM ĐÓN) */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
              {editingServiceId ? 'Sửa Dịch Vụ Affiliate' : 'Thêm Dịch Vụ Affiliate Mới'}
            </h3>

            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
              Khu vực: <strong>{serviceForm.region}</strong> | Địa điểm: <strong>{serviceForm.destination}</strong>
            </div>

            <form onSubmit={handleSaveService}>
              {/* Loại dịch vụ: Cư trú / Nhà xe */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Loại Dịch Vụ</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="radio" 
                      name="category" 
                      value="hotel" 
                      checked={serviceForm.category === 'hotel'}
                      onChange={() => setServiceForm({ ...serviceForm, category: 'hotel' })}
                    />
                    <Building size={14} color="#2563eb" /> Cư trú (Khách sạn / Homestay / Resort)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="radio" 
                      name="category" 
                      value="transport" 
                      checked={serviceForm.category === 'transport'}
                      onChange={() => setServiceForm({ ...serviceForm, category: 'transport' })}
                    />
                    <Bus size={14} color="#16a34a" /> Nhà xe (Xe khách / Limousine / Thuê xe)
                  </label>
                </div>
              </div>

              {/* Tên dịch vụ */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Tên Dịch Vụ / Khách sạn / Nhà xe *</label>
                <input 
                  type="text" 
                  required
                  value={serviceForm.name} 
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Vd: Khách sạn Mường Thanh Grand hoặc Xe Limousine Phúc Xuyên"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Link Affiliate */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Link Tiếp Thị Liên Kết (Affiliate URL) *</label>
                <input 
                  type="url" 
                  required
                  value={serviceForm.affiliateUrl} 
                  onChange={(e) => setServiceForm({ ...serviceForm, affiliateUrl: e.target.value })}
                  placeholder="https://agoda.com/partners/... hoặc https://vexere.com/..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Ghi chú / Tiện ích */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Ghi chú / Tiện ích nổi bật</label>
                <textarea 
                  rows={3}
                  value={serviceForm.notes} 
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  placeholder="Vd: Gần biển, có hồ bơi vô cực, buffet sáng hoặc Xe 9 chỗ massage đưa đón tận nơi..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Trạng thái hoạt động */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={serviceForm.isActive} 
                    onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                  />
                  Kích hoạt hiển thị cho người dùng
                </label>
              </div>

              {/* Nút tác vụ */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowServiceModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Lưu dịch vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM ĐỊA ĐIỂM DU LỊCH MỚI */}
      {showAddDestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>Thêm Địa Điểm Du Lịch Mới</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
              Địa điểm này sẽ thuộc về khu vực: <strong>{selectedRegion}</strong>
            </p>

            <form onSubmit={handleCreateDestination}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Tên Địa Điểm Du Lịch *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newDestName} 
                  onChange={(e) => setNewDestName(e.target.value)}
                  placeholder="Vd: Vịnh Hạ Long, Bãi Cháy, Đảo Cô Tô, Bà Nà Hills..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddDestModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Tiếp tục thêm dịch vụ ➜
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: THÊM KHU VỰC / TỈNH MỚI */}
      {showAddRegionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>Thêm Khu Vực / Tỉnh Thành Mới</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
              Tạo một tỉnh hoặc khu vực mới để bắt đầu thêm địa điểm vui chơi và link affiliate.
            </p>

            <form onSubmit={handleCreateRegion}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Tên Tỉnh / Khu Vực *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newRegionName} 
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Vd: Quảng Ninh, Đà Nẵng, Nha Trang, Phú Quốc, Ninh Bình..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddRegionModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Tạo khu vực ➜
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAffiliateServices;
