import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete from '../components/LocationAutocomplete';
import api from '../services/api';
import { getShortLocation } from '../utils/formatLocation';
import './CreateTripPage.css';

const CreateTripPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    origin: 'Hà Nội, Việt Nam',
    destination: 'Ninh Bình, Việt Nam',
    startDate: '2026-09-16',
    endDate: '2026-09-20',
    budget: '12000000',
    numberOfParticipants: '4',
    preferences: ['Thiên nhiên']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tags = ['Thiên nhiên', 'Ẩm thực', 'Chụp ảnh', 'Tham quan'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => {
      const prefs = prev.preferences;
      if (prefs.includes(tag)) {
        return { ...prev, preferences: prefs.filter(t => t !== tag) };
      } else {
        return { ...prev, preferences: [...prefs, tag] };
      }
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    // Validation
    if (!formData.origin.trim() || !formData.destination.trim()) {
      setError('Vui lòng nhập Nơi bắt đầu và Điểm đến.');
      setLoading(false);
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      setLoading(false);
      return;
    }

    const participants = parseInt(formData.numberOfParticipants);
    if (isNaN(participants) || participants < 1) {
      setError('Quy mô nhóm phải là số lớn hơn 0.');
      setLoading(false);
      return;
    }

    const budget = parseFloat(formData.budget);
    if (isNaN(budget) || budget <= 0) {
      setError('Ngân sách phải là số dương.');
      setLoading(false);
      return;
    }

    // Budget Rule Calculation
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const rooms = Math.ceil(participants / 2);
    
    // Đã bỏ nhân số người/số phòng với số ngày theo yêu cầu
    const totalMinBudget = (days * 1000000) + ((participants - 1) * 500000) + ((rooms - 1) * 500000);

    if (budget < totalMinBudget) {
      setError(`Ngân sách tối thiểu cho chuyến đi này là ${totalMinBudget.toLocaleString('vi-VN')} VNĐ.`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: `Từ ${getShortLocation(formData.origin)} đi ${getShortLocation(formData.destination)}`,
        origin: formData.origin,
        destination: formData.destination,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        budget: parseFloat(formData.budget),
        numberOfParticipants: parseInt(formData.numberOfParticipants),
        preferences: formData.preferences.join(', ')
      };

      const res = await api.post('/Trip', payload);
      navigate(`/dashboard`);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : 'Chuyến đi với dữ liệu giống hệt đã tồn tại.');
      } else {
        setError('Có lỗi xảy ra khi tạo chuyến đi. Bạn đã đăng nhập chưa?');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateAllocation = () => {
    const totalBudget = parseFloat(formData.budget) || 0;
    
    // Tính toán số đêm và số phòng (giả sử 2 người/phòng, lấy mức trung bình là 375k/phòng/đêm để tổng ra khoảng giữa)
    const days = Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24));
    const nights = Math.max(0, days); // Số đêm lưu trú
    const participants = parseInt(formData.numberOfParticipants) || 1;
    const rooms = Math.ceil(participants / 2);
    const luuTruCost = nights * rooms * 375000;
    
    // Phần trăm cho lưu trú
    let luuTruPercent = 0;
    if (totalBudget > 0 && nights > 0) {
      luuTruPercent = Math.min(100, Math.round((luuTruCost / totalBudget) * 100));
    }
    
    const remainingPercent = 100 - luuTruPercent;

    // Trọng số cho 3 hạng mục còn lại
    let weights = { anUong: 35, diChuyen: 30, traiNghiem: 35 };
    const prefs = formData.preferences;
    
    if (prefs.includes('Thiên nhiên')) { weights.traiNghiem += 15; weights.diChuyen += 10; }
    if (prefs.includes('Ẩm thực')) { weights.anUong += 25; }
    if (prefs.includes('Chụp ảnh')) { weights.diChuyen += 10; weights.traiNghiem += 15; }
    if (prefs.includes('Tham quan')) { weights.traiNghiem += 20; weights.diChuyen += 15; }

    const totalWeight = weights.anUong + weights.diChuyen + weights.traiNghiem;
    
    const alloc = {
      luuTru: luuTruPercent,
      anUong: Math.round((weights.anUong / totalWeight) * remainingPercent),
      diChuyen: Math.round((weights.diChuyen / totalWeight) * remainingPercent)
    };
    alloc.traiNghiem = 100 - alloc.luuTru - alloc.anUong - alloc.diChuyen;

    return alloc;
  };

  const allocation = calculateAllocation();
  const totalBudget = parseFloat(formData.budget) || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tạo chuyến đi mới</h1>
          <p className="page-subtitle">Điền thông tin chính trước, bạn có thể chỉnh chi tiết sau.</p>
        </div>
      </div>


      <div className="create-grid">
        <div className="form-section">
          <h2>Bạn muốn đi đâu?</h2>
          <p className="form-subtitle">Thông tin này giúp xây lịch trình vừa sức và đúng ngân sách.</p>

          {error && <div style={{background: '#FFEBEB', color: '#D32F2F', padding: 12, borderRadius: 8, marginBottom: 16}}>{error}</div>}

          <div className="form-row">
            <div className="form-group" style={{ position: 'relative' }}>
              <label>NƠI BẮT ĐẦU</label>
              <LocationAutocomplete 
                name="origin" 
                placeholder="VD: Hà Nội, Việt Nam" 
                value={formData.origin} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>ĐIỂM ĐẾN</label>
              <LocationAutocomplete 
                name="destination" 
                placeholder="VD: Ninh Bình, Việt Nam" 
                value={formData.destination} 
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>THỜI GIAN BẮT ĐẦU</label>
              <input name="startDate" type="date" className="form-input" value={formData.startDate} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>THỜI GIAN KẾT THÚC</label>
              <input name="endDate" type="date" className="form-input" value={formData.endDate} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>NGÂN SÁCH (VNĐ)</label>
              <input name="budget" type="number" className="form-input" value={formData.budget} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>QUY MÔ NHÓM</label>
              <input name="numberOfParticipants" type="number" className="form-input" value={formData.numberOfParticipants} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <label>CÁCH BẠN MUỐN TRẢI NGHIỆM</label>
            <div className="tags-container">
              {tags.map(t => (
                <div 
                  key={t} 
                  className={`tag ${formData.preferences.includes(t) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(t)}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="suggestion-box">
            <div className="suggestion-label">GỢI Ý ĐANG ÁP DỤNG</div>
            <div className="suggestion-desc">Nhịp vừa phải · tối đa 3 hoạt động/ngày · ưu tiên tuyến gần nhau</div>
          </div>

          <button className="btn-primary w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo chuyến đi và trải nghiệm'}
          </button>
        </div>

        <div className="summary-section">
          <h3 className="summary-title">Tóm tắt chuyến đi</h3>
          
          <div className="summary-card">
            <div className="summary-dest">{getShortLocation(formData.destination) || 'NINH BÌNH'}</div>
            <div className="summary-main">Nhóm {formData.numberOfParticipants} người</div>
            <div className="summary-budget">Tổng ngân sách {totalBudget.toLocaleString('vi-VN')} đ</div>
          </div>

          <div className="allocation-box">
            <div className="allocation-header">PHÂN BỔ GỢI Ý</div>
            
            <div className="alloc-item">
              <div className="alloc-text"><span>Lưu trú ({(totalBudget * allocation.luuTru / 100).toLocaleString('vi-VN')} đ)</span><span>{allocation.luuTru}%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: `${allocation.luuTru}%`}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Ăn uống ({(totalBudget * allocation.anUong / 100).toLocaleString('vi-VN')} đ)</span><span>{allocation.anUong}%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: `${allocation.anUong}%`}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Di chuyển ({(totalBudget * allocation.diChuyen / 100).toLocaleString('vi-VN')} đ)</span><span>{allocation.diChuyen}%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: `${allocation.diChuyen}%`}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Trải nghiệm ({(totalBudget * allocation.traiNghiem / 100).toLocaleString('vi-VN')} đ)</span><span>{allocation.traiNghiem}%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: `${allocation.traiNghiem}%`}}></div></div>
            </div>
          </div>

          <div className="note-box">
            <div className="note-label">LƯU Ý</div>
            <div className="note-desc">Ngân sách đủ thoải mái cho lịch trình hiện tại. Có thể điều chỉnh sau khi mời thành viên.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTripPage;
