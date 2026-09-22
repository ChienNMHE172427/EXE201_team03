import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import './BudgetPage.css';

const BudgetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [draftExpenses, setDraftExpenses] = useState([{desc: '', price: '', quantity: 1}]);

  // Lấy danh sách chuyến đi ban đầu
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);

        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          setSelectedTripId(parseInt(tripIdFromUrl));
        }
        
        const autoExpenses = params.get('autoExpenses');
        const autoExpense = params.get('autoExpense');
        
        if (autoExpenses) {
          try {
             const parsed = JSON.parse(decodeURIComponent(autoExpenses));
             if (Array.isArray(parsed) && parsed.length > 0) {
                 setDraftExpenses(parsed.map(d => ({desc: d, price: '', quantity: 1})));
                 setShowForm(true);
             }
          } catch(e) {}
        } else if (autoExpense) {
          setDraftExpenses([{desc: autoExpense, price: '', quantity: 1}]);
          setShowForm(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const fetchBudget = async (id) => {
    try {
      const [tripRes, expRes] = await Promise.all([
        api.get(`/Trip/${id}`),
        api.get(`/trips/${id}/expenses`)
      ]);
      setTrip(tripRes.data);
      setExpenses(expRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchBudget(selectedTripId);
    }
  }, [selectedTripId]);

  const handleAddExpense = async () => {
    if (!selectedTripId) return;
    const validDrafts = draftExpenses.filter(d => d.desc && d.price);
    if (validDrafts.length === 0) {
       alert('Vui lòng nhập đầy đủ tên dịch vụ và đơn giá cho ít nhất 1 khoản chi!');
       return;
    }
    
    try {
      await Promise.all(validDrafts.map(d => {
        const finalAmount = parseFloat(d.price) * parseInt(d.quantity || 1);
        return api.post(`/trips/${selectedTripId}/expenses`, {
          description: d.desc + (d.quantity > 1 ? ` (x${d.quantity})` : ''),
          amount: finalAmount
        });
      }));
      
      setDraftExpenses([{desc: '', price: '', quantity: 1}]);
      setShowForm(false);
      // Remove query param to prevent form re-opening on reload
      navigate(`/budget?tripId=${selectedTripId}`, { replace: true });
      fetchBudget(selectedTripId); // reload
    } catch(err) {
      alert('Lỗi: Không thể thêm chi phí.');
    }
  };

  const handleSelectTrip = (t) => {
    setSelectedTripId(t.id);
  };

  const handleBack = () => {
    setSelectedTripId(null);
    setTrip(null);
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  if (!selectedTripId || !trip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Chi phí nhóm</h1>
            <p className="page-subtitle">Chọn một lịch trình để kiểm soát ngân sách và chi tiêu.</p>
          </div>
        </div>
        
        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div key={t.id} onClick={() => handleSelectTrip(t)} style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #FF9A9E, #FECFEF)' }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{display: 'flex', alignItems: 'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Nhóm: {t.numberOfParticipants || 1} người</span>
                    <span style={{display: 'flex', alignItems: 'center', marginTop: 4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Điểm đến: {getShortLocation(t.destination)}</span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#ff7b89', fontSize: '14px' }}>
                    + Mở quản lý chi phí
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = trip.budget - totalSpent;
  const percent = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {trip.title}
        </button>
      </div>

      <div className="wizard-steps-container">
        <div className="wizard-steps">
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/itinerary?tripId=${selectedTripId}`)}>
            <div className="step-circle">1</div>
            <div className="step-info">
              <div className="step-title">Lịch trình</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/explore?tripId=${selectedTripId}`)}>
            <div className="step-circle">2</div>
            <div className="step-info">
              <div className="step-title">Khám phá & Dịch vụ</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step active">
            <div className="step-circle">3</div>
            <div className="step-info">
              <div className="step-title">Chi phí nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/collaborate?tripId=${selectedTripId}`)}>
            <div className="step-circle">4</div>
            <div className="step-info">
              <div className="step-title">Cộng tác nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents?tripId=${selectedTripId}`)}>
            <div className="step-circle">5</div>
            <div className="step-info">
              <div className="step-title">Trạng thái</div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Chi phí: {formatItemTitle(trip.title)}</h1>
          <p className="page-subtitle">Kiểm soát ngân sách và chia tiền minh bạch.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hủy' : '+ Thêm khoản chi'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, marginBottom: 32, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <h3 style={{margin: 0}}>Ghi nhận chi phí mới</h3>
            <button className="btn-secondary" style={{padding: '6px 12px', fontSize: '13px'}} onClick={() => setDraftExpenses([...draftExpenses, {desc: '', price: '', quantity: 1}])}>+ Thêm dòng</button>
          </div>
          {draftExpenses.map((draft, index) => (
            <div key={index} style={{display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: draftExpenses.length > 1 ? 16 : 0}}>
              <div style={{flex: 2}}>
                {index === 0 && <label style={{fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block'}}>TÊN DỊCH VỤ</label>}
                <input type="text" className="form-input" placeholder="Tên khoản chi (VD: Vé Tràng An)" value={draft.desc} onChange={e => {
                  const newDrafts = [...draftExpenses];
                  newDrafts[index].desc = e.target.value;
                  setDraftExpenses(newDrafts);
                }} />
              </div>
              <div style={{flex: 1}}>
                {index === 0 && <label style={{fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block'}}>ĐƠN GIÁ (VNĐ)</label>}
                <input type="number" className="form-input" placeholder="Giá 1 dịch vụ" value={draft.price} onChange={e => {
                  const newDrafts = [...draftExpenses];
                  newDrafts[index].price = e.target.value;
                  setDraftExpenses(newDrafts);
                }} />
              </div>
              <div style={{flex: 0.5}}>
                {index === 0 && <label style={{fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block'}}>SỐ LƯỢNG</label>}
                <input type="number" className="form-input" min="1" value={draft.quantity} onChange={e => {
                  const newDrafts = [...draftExpenses];
                  newDrafts[index].quantity = e.target.value;
                  setDraftExpenses(newDrafts);
                }} />
              </div>
              <div style={{flex: 0.5, display: 'flex', flexDirection: 'column', justifyContent: index === 0 ? 'flex-end' : 'center', height: index === 0 ? '62px' : 'auto', paddingTop: index === 0 ? 0 : 8}}>
                 {draftExpenses.length > 1 && (
                   <button onClick={() => setDraftExpenses(draftExpenses.filter((_, i) => i !== index))} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 8, fontWeight: 'bold'}}>Xóa</button>
                 )}
              </div>
            </div>
          ))}
          <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16}}>
             <div style={{fontWeight: 'bold', color: 'var(--color-primary-dark)', marginRight: 16, fontSize: '15px'}}>
                Tổng cộng: {draftExpenses.reduce((sum, d) => sum + (parseFloat(d.price) || 0) * (parseInt(d.quantity) || 1), 0).toLocaleString('vi-VN')} đ
             </div>
             <button className="btn-primary" onClick={handleAddExpense}>Lưu tất cả chi phí</button>
          </div>
        </div>
      )}

      <div className="budget-grid">
        <div className="budget-main">
          <div className="budget-overview">
            <div className="overview-item">
              <div className="label">NGÂN SÁCH TỔNG</div>
              <div className="val">{trip.budget.toLocaleString('vi-VN')} đ</div>
            </div>
            <div className="overview-item">
              <div className="label">ĐÃ CHI TIÊU</div>
              <div className="val warning">{totalSpent.toLocaleString('vi-VN')} đ</div>
            </div>
            <div className="overview-item">
              <div className="label">CÒN LẠI</div>
              <div className="val success">{remaining.toLocaleString('vi-VN')} đ</div>
            </div>
          </div>

          <div className="progress-bar lg">
            <div className="progress-fill warning" style={{width: `${percent}%`}}></div>
          </div>

          <h3 className="section-title mt-8">Danh sách chi tiêu thực tế</h3>
          
          <div className="expense-list">
            {expenses.length === 0 ? (
              <p style={{color: 'var(--color-text-muted)'}}>Chưa có khoản chi nào.</p>
            ) : (
              expenses.map(ex => (
                <div className="expense-item" key={ex.id}>
                  <div className="ex-icon c1">💰</div>
                  <div className="ex-info">
                    <div className="ex-title">{ex.description}</div>
                    <div className="ex-desc">Thêm vào lúc {new Date(ex.expenseDate).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div className="ex-amount">{ex.amount.toLocaleString('vi-VN')} đ</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="budget-sidebar">
          <div className="balance-card">
            <h3>Tổng kết thanh toán</h3>
            <p className="balance-desc">Hệ thống tính toán bù trừ.</p>

            <div className="balance-item">
              <div className="user-info">
                <div className="avatar c1">?</div>
                <span>Tất cả thành viên</span>
              </div>
              <div className="bal-val positive">Đã chi {totalSpent.toLocaleString('vi-VN')} đ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
