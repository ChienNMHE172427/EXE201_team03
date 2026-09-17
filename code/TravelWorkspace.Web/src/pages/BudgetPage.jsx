import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './BudgetPage.css';

const BudgetPage = () => {
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  // Lấy tripId từ LocalStorage (do Dashboard thiết lập) hoặc gọi Trip cuối
  const tripId = localStorage.getItem('currentTripId');

  const fetchBudget = async () => {
    try {
      if (!tripId) {
        // Fallback: lấy chuyến đi đầu tiên
        const t = await api.get('/Trip');
        if (t.data.length > 0) {
          localStorage.setItem('currentTripId', t.data[0].id);
          window.location.reload();
          return;
        }
      } else {
        const [tripRes, expRes] = await Promise.all([
          api.get(`/Trip/${tripId}`),
          api.get(`/trips/${tripId}/expenses`)
        ]);
        setTrip(tripRes.data);
        setExpenses(expRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [tripId]);

  const handleAddExpense = async () => {
    if (!desc || !amount) return;
    try {
      await api.post(`/trips/${tripId}/expenses`, {
        description: desc,
        amount: parseFloat(amount)
      });
      setDesc('');
      setAmount('');
      setShowForm(false);
      fetchBudget(); // reload
    } catch(err) {
      alert('Lỗi: Không thể thêm chi phí.');
    }
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải ngân sách...</h2></div>;
  if (!trip) return <div className="page-container"><h2 style={{marginTop: 40}}>Chưa có chuyến đi nào được chọn.</h2></div>;

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = trip.budget - totalSpent;
  const percent = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chi phí: {trip.title}</h1>
          <p className="page-subtitle">Kiểm soát ngân sách và chia tiền minh bạch.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hủy' : '+ Thêm khoản chi'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, marginBottom: 32, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{marginBottom: 16}}>Ghi nhận chi phí mới</h3>
          <div style={{display: 'flex', gap: 16}}>
            <input type="text" className="form-input" placeholder="Tên khoản chi (VD: Vé Tràng An)" value={desc} onChange={e => setDesc(e.target.value)} style={{flex: 2}} />
            <input type="number" className="form-input" placeholder="Số tiền (VNĐ)" value={amount} onChange={e => setAmount(e.target.value)} style={{flex: 1}} />
            <button className="btn-primary" onClick={handleAddExpense}>Lưu chi phí</button>
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
