import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CreateTripPage.css';

const CreateTripPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    destination: 'Ninh Bình, Việt Nam',
    startDate: '2026-09-16',
    endDate: '2026-09-20',
    budget: '12000000',
    numberOfParticipants: '4',
    preferences: 'Thiên nhiên'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tags = ['Thiên nhiên', 'Ẩm thực', 'Văn hóa', 'Chụp ảnh', 'Đi chậm'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        title: `Chuyến đi tới ${formData.destination}`,
        destination: formData.destination,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        budget: parseFloat(formData.budget),
        numberOfParticipants: parseInt(formData.numberOfParticipants),
        preferences: formData.preferences
      };

      const res = await api.post('/Trip', payload);
      // Giả sử API trả về chuyến đi mới tạo, chuyển hướng sang dashboard
      navigate(`/dashboard`);
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra khi tạo chuyến đi. Bạn đã đăng nhập chưa?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tạo chuyến đi mới</h1>
          <p className="page-subtitle">Điền thông tin chính trước, bạn có thể chỉnh chi tiết sau.</p>
        </div>
      </div>

      <div className="wizard-steps">
        <div className="step active">
          <div className="step-circle">1</div>
          <div className="step-info">
            <div className="step-title">Thông tin chuyến đi</div>
            <div className="step-desc">Điểm đến và thời gian</div>
          </div>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">2</div>
          <div className="step-info">
            <div className="step-title">Cách trải nghiệm</div>
            <div className="step-desc">Sở thích và ngân sách</div>
          </div>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">3</div>
          <div className="step-info">
            <div className="step-title">Mời bạn bè</div>
            <div className="step-desc">Hoàn thiện nhóm đi</div>
          </div>
        </div>
      </div>

      <div className="create-grid">
        <div className="form-section">
          <h2>Bạn muốn đi đâu?</h2>
          <p className="form-subtitle">Thông tin này giúp xây lịch trình vừa sức và đúng ngân sách.</p>

          {error && <div style={{background: '#FFEBEB', color: '#D32F2F', padding: 12, borderRadius: 8, marginBottom: 16}}>{error}</div>}

          <div className="form-group">
            <label>ĐIỂM ĐẾN</label>
            <input name="destination" type="text" className="form-input" placeholder="VD: Ninh Bình, Việt Nam" value={formData.destination} onChange={handleInputChange} />
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
                  className={`tag ${formData.preferences === t ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, preferences: t }))}
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
            <div className="summary-dest">NINH BÌNH</div>
            <div className="summary-main">5 ngày · 4 người</div>
            <div className="summary-date">16 – 20 tháng 09</div>
            <div className="summary-budget">Dự kiến 3.000.000đ / người</div>
          </div>

          <div className="allocation-box">
            <div className="allocation-header">PHÂN BỔ GỢI Ý</div>
            
            <div className="alloc-item">
              <div className="alloc-text"><span>Lưu trú</span><span>35%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: '35%'}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Ăn uống</span><span>25%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: '25%'}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Di chuyển</span><span>20%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: '20%'}}></div></div>
            </div>
            <div className="alloc-item">
              <div className="alloc-text"><span>Trải nghiệm</span><span>20%</span></div>
              <div className="alloc-bar"><div className="fill" style={{width: '20%'}}></div></div>
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
