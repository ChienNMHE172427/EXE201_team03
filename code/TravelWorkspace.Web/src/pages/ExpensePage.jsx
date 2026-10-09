import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Wallet, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  X, 
  Image as ImageIcon, 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck,
  FileText,
  MapPin
} from 'lucide-react';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import './BudgetPage.css';
import TripNavigation from '../components/TripNavigation';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5300';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

const ExpensePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'group' (Quỹ chung) or 'personal' (Ví riêng của tôi)
  const [activeTab, setActiveTab] = useState('group');

  // Expense Lists & Summaries
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [personalExpenses, setPersonalExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // Form states
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showPersonalForm, setShowPersonalForm] = useState(false);

  // Drafts for Group Fund (allows batch entry)
  const [groupDrafts, setGroupDrafts] = useState([{ desc: '', price: '', quantity: 1, paidById: '' }]);

  // Form for Personal Wallet (Simplified: Name, Amount, Date, Image)
  const [personalForm, setPersonalForm] = useState({
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    imageUrl: ''
  });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Edit Expense Modal
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', expenseDate: '', imageUrl: '' });

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Current logged in user
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = parseInt(localStorage.getItem('userId') || storedUser.id || '0');

  // Initial Trip fetch
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
              setGroupDrafts(parsed.map(d => ({ desc: d, price: '', quantity: 1, paidById: '' })));
              setShowGroupForm(true);
            }
          } catch (e) {}
        } else if (autoExpense) {
          setGroupDrafts([{ desc: autoExpense, price: '', quantity: 1, paidById: '' }]);
          setShowGroupForm(true);
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  // Fetch expenses and summary when trip selected
  const fetchTripExpensesData = async (tripId) => {
    try {
      const [tripRes, groupExpRes, personalExpRes, summaryRes] = await Promise.all([
        api.get(`/Trip/${tripId}`),
        api.get(`/trips/${tripId}/expenses?isPersonal=false`),
        api.get(`/trips/${tripId}/expenses?isPersonal=true`),
        api.get(`/trips/${tripId}/expenses/summary`)
      ]);

      setTrip(tripRes.data);
      setGroupExpenses(groupExpRes.data);
      setPersonalExpenses(personalExpRes.data);
      setExpenseSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching expenses data:', err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchTripExpensesData(selectedTripId);
    }
  }, [selectedTripId]);

  // Handle adding group expenses
  const handleAddGroupExpenses = async () => {
    if (!selectedTripId) return;
    const validDrafts = groupDrafts.filter(d => d.desc && d.price);
    if (validDrafts.length === 0) {
      alert('Vui lòng nhập đầy đủ tên dịch vụ và đơn giá cho ít nhất 1 khoản chi!');
      return;
    }

    try {
      await Promise.all(validDrafts.map(d => {
        const finalAmount = parseFloat(d.price) * parseInt(d.quantity || 1);
        return api.post(`/trips/${selectedTripId}/expenses`, {
          description: d.desc + (d.quantity > 1 ? ` (x${d.quantity})` : ''),
          amount: finalAmount,
          isPersonal: false,
          paidById: d.paidById ? parseInt(d.paidById) : null
        });
      }));

      setGroupDrafts([{ desc: '', price: '', quantity: 1, paidById: '' }]);
      setShowGroupForm(false);
      navigate(`/budget?tripId=${selectedTripId}`, { replace: true });
      await fetchTripExpensesData(selectedTripId);
    } catch (err) {
      alert('Lỗi: Không thể thêm chi phí nhóm.');
    }
  };

  // Handle uploading receipt image for personal wallet
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingReceipt(true);
    try {
      const res = await api.post(`/trips/${selectedTripId}/expenses/upload-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPersonalForm(prev => ({ ...prev, imageUrl: res.data.url }));
    } catch (err) {
      alert('Lỗi khi tải ảnh hóa đơn lên.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Handle adding personal expense (Simplified form)
  const handleAddPersonalExpense = async (e) => {
    e.preventDefault();
    if (!personalForm.description.trim() || !personalForm.amount) {
      alert('Vui lòng nhập tên món đồ và số tiền chi tiêu.');
      return;
    }

    try {
      await api.post(`/trips/${selectedTripId}/expenses`, {
        description: personalForm.description.trim(),
        amount: parseFloat(personalForm.amount),
        expenseDate: personalForm.expenseDate ? new Date(personalForm.expenseDate).toISOString() : new Date().toISOString(),
        isPersonal: true,
        imageUrl: personalForm.imageUrl || null
      });

      setPersonalForm({
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        imageUrl: ''
      });
      setShowPersonalForm(false);
      await fetchTripExpensesData(selectedTripId);
    } catch (err) {
      alert('Lỗi: Không thể lưu khoản chi tiêu cá nhân.');
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (id, isPersonal) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khoản chi tiêu này?')) return;
    try {
      await api.delete(`/trips/${selectedTripId}/expenses/${id}`);
      await fetchTripExpensesData(selectedTripId);
    } catch (err) {
      alert('Lỗi khi xóa khoản chi phí.');
    }
  };

  // Handle open edit modal
  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '',
      imageUrl: expense.imageUrl || ''
    });
  };

  // Handle update expense
  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      await api.put(`/trips/${selectedTripId}/expenses/${editingExpense.id}`, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        expenseDate: editForm.expenseDate ? new Date(editForm.expenseDate).toISOString() : null,
        isPersonal: editingExpense.isPersonal,
        imageUrl: editForm.imageUrl || null
      });

      setEditingExpense(null);
      await fetchTripExpensesData(selectedTripId);
    } catch (err) {
      alert('Lỗi khi cập nhật chi phí.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2 style={{ marginTop: 40 }}>Đang tải dữ liệu chi phí...</h2>
      </div>
    );
  }

  // If no trip selected, render trip list
  if (!selectedTripId || !trip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quản lý chi tiêu & Ví chuyến đi</h1>
            <p className="page-subtitle">Chọn một lịch trình để quản lý quỹ chung và ví cá nhân độc lập.</p>
          </div>
        </div>

        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}
              >
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <Users size={14} color="#8b5cf6" style={{ marginRight: 6 }} /> Nhóm: {t.numberOfParticipants || 1} người
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                      <MapPin size={14} color="#ef4444" style={{ marginRight: 6 }} /> Điểm đến: {getShortLocation(t.destination)}
                    </span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#6366f1', fontSize: '14px' }}>
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

  // Calculate totals
  const groupTotal = expenseSummary ? expenseSummary.groupTotalSpent : groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  const personalTotal = expenseSummary ? expenseSummary.personalTotalSpent : personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUserSpend = (expenseSummary?.balances?.find(b => b.userId === currentUserId)?.paidAmount || 0) + personalTotal;
  const remainingBudget = trip.budget - groupTotal;
  const groupPercent = trip.budget > 0 ? Math.min((groupTotal / trip.budget) * 100, 100) : 0;

  return (
    <div className="page-container">
      {/* Back button & title */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => { setSelectedTripId(null); setTrip(null); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} />
          {trip.title}
        </button>
      </div>

      {/* 5-Step Wizard Navigation */}
      <TripNavigation selectedTripId={selectedTripId} />

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chi phí: {formatItemTitle(trip.title)}</h1>
          <p className="page-subtitle">Tách bạch quỹ chung của nhóm và ví chi tiêu cá nhân độc lập.</p>
        </div>
        <div>
          {activeTab === 'group' ? (
            <button className="btn-primary" onClick={() => setShowGroupForm(!showGroupForm)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showGroupForm ? <X size={18} /> : <Plus size={18} />}
              {showGroupForm ? 'Đóng Form' : '+ Thêm chi phí nhóm'}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setShowPersonalForm(!showPersonalForm)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#db2777' }}>
              {showPersonalForm ? <X size={18} /> : <Plus size={18} />}
              {showPersonalForm ? 'Đóng Form' : '+ Thêm chi tiêu riêng'}
            </button>
          )}
        </div>
      </div>

      {/* 2 DISTINCT STAT CARDS (Theo yêu cầu kỹ thuật) */}
      <div className="dual-stats-grid">
        {/* Card 1: Tổng quỹ chung */}
        <div className="stat-card-gradient stat-card-group">
          <div>
            <div className="stat-card-header">
              <span className="stat-card-title"><Users size={16} style={{marginRight: 6}} /> TỔNG QUỸ CHUNG NHÓM</span>
              <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                Chia đều cho nhóm
              </span>
            </div>
            <div className="stat-card-value">
              {groupTotal.toLocaleString('vi-VN')} đ
            </div>
            <div className="stat-card-subtitle" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>Ngân sách: <b>{trip.budget.toLocaleString('vi-VN')} đ</b></span>
              <span style={{ color: remainingBudget >= 0 ? '#10b981' : '#ef4444' }}>
                {remainingBudget >= 0 ? `Còn lại: ${remainingBudget.toLocaleString('vi-VN')} đ` : `Vượt: ${Math.abs(remainingBudget).toLocaleString('vi-VN')} đ`}
              </span>
            </div>
          </div>
          <div className="progress-bar lg" style={{ margin: '14px 0 0 0', height: 8 }}>
            <div className="progress-fill warning" style={{ width: `${groupPercent}%`, background: groupPercent > 90 ? '#ef4444' : '#6366f1' }}></div>
          </div>
        </div>

        {/* Card 2: Tổng bạn đã tiêu riêng */}
        <div className="stat-card-gradient stat-card-personal">
          <div>
            <div className="stat-card-header">
              <span className="stat-card-title"><Wallet size={16} style={{marginRight: 6}} /> TỔNG BẠN ĐÃ TIÊU RIÊNG</span>
              <span className="personal-badge-tag">
                <ShieldCheck size={13} /> Ví riêng tư
              </span>
            </div>
            <div className="stat-card-value" style={{ color: '#be185d' }}>
              {personalTotal.toLocaleString('vi-VN')} đ
            </div>
            <div className="stat-card-subtitle" style={{ color: '#9d174d' }}>
              Bao gồm quà lưu niệm, mua sắm & chi tiêu cá nhân – <b>không tính vào quỹ nhóm</b> và không chia tiền.
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '12px', color: '#be185d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} /> Chỉ một mình bạn nhìn thấy danh sách này
          </div>
        </div>

        {/* Card 3: Tổng chi trả thực tế của chính bạn */}
        <div className="stat-card-gradient stat-card-total">
          <div>
            <div className="stat-card-header">
              <span className="stat-card-title"><DollarSign size={16} style={{marginRight: 6}} /> TỔNG TIỀN BẠN ĐÃ CHI</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                Cá nhân + Quỹ
              </span>
            </div>
            <div className="stat-card-value" style={{ color: '#047857' }}>
              {totalUserSpend.toLocaleString('vi-VN')} đ
            </div>
            <div className="stat-card-subtitle">
              Đã trả cho nhóm: {((expenseSummary?.balances?.find(b => b.userId === currentUserId)?.paidAmount) || 0).toLocaleString('vi-VN')} đ + Chi riêng: {personalTotal.toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>
      </div>

      {/* 2 TABS RÕ RỆT (Tabs header) */}
      <div className="expense-tabs-container">
        <button
          className={`expense-tab-btn ${activeTab === 'group' ? 'active' : ''}`}
          onClick={() => setActiveTab('group')}
        >
          <Users size={18} />
          <span>Quỹ chung ({groupExpenses.length})</span>
          <span className="tab-badge badge-group">{groupTotal.toLocaleString('vi-VN')} đ</span>
        </button>

        <button
          className={`expense-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <Wallet size={18} />
          <span>Ví riêng của tôi ({personalExpenses.length})</span>
          <span className="tab-badge badge-personal">{personalTotal.toLocaleString('vi-VN')} đ</span>
        </button>
      </div>

      {/* TAB 1: QUỸ CHUNG (GROUP FUND) */}
      {activeTab === 'group' && (
        <div>
          {/* Form thêm chi phí nhóm */}
          {showGroupForm && (
            <div style={{ background: '#fff', padding: 24, borderRadius: 16, marginBottom: 32, boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Ghi nhận chi phí Quỹ chung</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Chi phí này sẽ được tính vào quỹ chung và tham gia chia nợ của nhóm.</p>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => setGroupDrafts([...groupDrafts, { desc: '', price: '', quantity: 1, paidById: '' }])}
                >
                  + Thêm dòng
                </button>
              </div>

              {groupDrafts.map((draft, index) => (
                <div key={index} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: groupDrafts.length > 1 ? 16 : 0 }}>
                  <div style={{ flex: 2 }}>
                    {index === 0 && <label style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block' }}>TÊN DỊCH VỤ / KHOẢN CHI</label>}
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Vé tham quan, Tiền thuê xe, Bữa tối..."
                      value={draft.desc}
                      onChange={e => {
                        const newDrafts = [...groupDrafts];
                        newDrafts[index].desc = e.target.value;
                        setGroupDrafts(newDrafts);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1.2 }}>
                    {index === 0 && <label style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block' }}>ĐƠN GIÁ (VNĐ)</label>}
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Số tiền"
                      value={draft.price}
                      onChange={e => {
                        const newDrafts = [...groupDrafts];
                        newDrafts[index].price = e.target.value;
                        setGroupDrafts(newDrafts);
                      }}
                    />
                  </div>
                  <div style={{ flex: 0.7 }}>
                    {index === 0 && <label style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4, display: 'block' }}>SỐ LƯỢNG</label>}
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={draft.quantity}
                      onChange={e => {
                        const newDrafts = [...groupDrafts];
                        newDrafts[index].quantity = e.target.value;
                        setGroupDrafts(newDrafts);
                      }}
                    />
                  </div>
                  <div style={{ flex: 0.5, display: 'flex', flexDirection: 'column', justifyContent: index === 0 ? 'flex-end' : 'center', height: index === 0 ? '62px' : 'auto', paddingTop: index === 0 ? 0 : 8 }}>
                    {groupDrafts.length > 1 && (
                      <button
                        onClick={() => setGroupDrafts(groupDrafts.filter((_, i) => i !== index))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 8, fontWeight: 'bold' }}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 }}>
                <div style={{ fontWeight: 'bold', color: 'var(--color-primary-dark)', marginRight: 16, fontSize: '15px' }}>
                  Tổng cộng: {groupDrafts.reduce((sum, d) => sum + (parseFloat(d.price) || 0) * (parseInt(d.quantity) || 1), 0).toLocaleString('vi-VN')} đ
                </div>
                <button className="btn-primary" onClick={handleAddGroupExpenses}>Lưu vào Quỹ chung</button>
              </div>
            </div>
          )}

          {/* Grid Layout: Danh sách chi phí chung & Tổng kết thanh toán */}
          <div className="budget-grid">
            <div className="budget-main">
              <h3 className="section-title">Danh sách chi tiêu Quỹ chung ({groupExpenses.length})</h3>

              <div className="expense-list">
                {groupExpenses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                    <p>Chưa có khoản chi quỹ chung nào.</p>
                    <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowGroupForm(true)}>+ Thêm khoản chi đầu tiên</button>
                  </div>
                ) : (
                  groupExpenses.map(ex => (
                    <div className="expense-item" key={ex.id}>
                      <div className="ex-icon c1">👥</div>
                      <div className="ex-info">
                        <div className="ex-title">{ex.description}</div>
                        <div className="ex-desc" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span>Người trả: <b>{ex.paidByName}</b></span>
                          <span>•</span>
                          <span>{new Date(ex.expenseDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="ex-amount">{ex.amount.toLocaleString('vi-VN')} đ</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleOpenEdit(ex)}
                            title="Chỉnh sửa"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 6 }}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(ex.id, false)}
                            title="Xóa"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6, borderRadius: 6 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BẢNG TỔNG KẾT THANH TOÁN (DEBT SETTLEMENT) - ĐÃ BẢO VỆ CHỈ TÍNH !IsPersonal */}
            <div className="budget-sidebar">
              <div className="balance-card">
                <h3>Tổng kết thanh toán Quỹ chung</h3>
                <p className="balance-desc">
                  Hệ thống tự động tính toán bù trừ bình quân giữa các thành viên. (Các khoản chi riêng tuyệt đối không được đưa vào đây).
                </p>

                {expenseSummary?.balances && expenseSummary.balances.length > 0 ? (
                  expenseSummary.balances.map(b => (
                    <div className="balance-item" key={b.userId}>
                      <div className="user-info">
                        <div className="avatar c4" style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {b.fullName ? b.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div>{b.fullName} {b.userId === currentUserId && '(Bạn)'}</div>
                          <div style={{ fontSize: '11px', color: '#B5D2CF' }}>
                            Đã đóng: {b.paidAmount.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                      <div className={`bal-val ${b.netBalance >= 0 ? 'positive' : 'negative'}`}>
                        {b.netBalance >= 0
                          ? `+ Nhận lại ${Math.abs(Math.round(b.netBalance)).toLocaleString('vi-VN')} đ`
                          : `- Cần đóng ${Math.abs(Math.round(b.netBalance)).toLocaleString('vi-VN')} đ`
                        }
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="balance-item">
                    <div className="user-info">
                      <div className="avatar c1">?</div>
                      <span>Tất cả thành viên</span>
                    </div>
                    <div className="bal-val positive">Đã chi {groupTotal.toLocaleString('vi-VN')} đ</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VÍ RIÊNG CỦA TÔI (PERSONAL WALLET) */}
      {activeTab === 'personal' && (
        <div>
          {/* Form thêm chi tiêu riêng - FORM RÚT GỌN THEO YÊU CẦU */}
          {showPersonalForm && (
            <div style={{ background: '#fff', padding: 26, borderRadius: 18, marginBottom: 32, boxShadow: 'var(--shadow-sm)', border: '2px solid #fbcfe8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#be185d', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={20} /> Thêm chi tiêu vào Ví riêng của tôi
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                    Chỉ cần: Tên món đồ, Số tiền, Ngày tháng và Hình ảnh hóa đơn (Ẩn hoàn toàn chia tiền hay ai trả).
                  </p>
                </div>
                <button
                  onClick={() => setShowPersonalForm(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddPersonalExpense}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  {/* 1. Tên món đồ */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, display: 'block' }}>
                      TÊN MÓN ĐỒ / DỊCH VỤ *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Quà lưu niệm, Cafe cá nhân, Đồ ăn vặt..."
                      required
                      value={personalForm.description}
                      onChange={e => setPersonalForm({ ...personalForm, description: e.target.value })}
                    />
                  </div>

                  {/* 2. Số tiền */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, display: 'block' }}>
                      SỐ TIỀN (VNĐ) *
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="VD: 150000"
                      min="0"
                      required
                      value={personalForm.amount}
                      onChange={e => setPersonalForm({ ...personalForm, amount: e.target.value })}
                    />
                  </div>

                  {/* 3. Ngày tháng */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, display: 'block' }}>
                      NGÀY THÁNG
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={personalForm.expenseDate}
                      onChange={e => setPersonalForm({ ...personalForm, expenseDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Hình ảnh / Hóa đơn đính kèm */}
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, display: 'block' }}>
                    HÌNH ẢNH HÓA ĐƠN / MÓN ĐỒ (TÙY CHỌN)
                  </label>

                  {personalForm.imageUrl ? (
                    <div className="receipt-preview-container">
                      <img
                        src={getMediaUrl(personalForm.imageUrl)}
                        alt="Receipt Preview"
                        className="receipt-thumb"
                        onClick={() => setPreviewImage(getMediaUrl(personalForm.imageUrl))}
                      />
                      <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>Đã đính kèm ảnh hóa đơn</span>
                      <button
                        type="button"
                        onClick={() => setPersonalForm({ ...personalForm, imageUrl: '' })}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Gỡ ảnh
                      </button>
                    </div>
                  ) : (
                    <label className="receipt-upload-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Upload size={18} color="#6366f1" />
                      <span style={{ fontSize: 13, color: '#475569' }}>
                        {uploadingReceipt ? 'Đang tải ảnh...' : 'Nhấp để tải lên ảnh hóa đơn / món hàng (< 5MB)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingReceipt}
                        onChange={handleReceiptUpload}
                      />
                    </label>
                  )}
                </div>

                {/* Submit action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowPersonalForm(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#db2777' }}>
                    Lưu vào Ví riêng
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Danh sách chi tiêu Ví riêng */}
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>Khoản chi cá nhân của bạn ({personalExpenses.length})</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                  Đây là những khoản chi tiêu độc lập, chỉ hiển thị với riêng bạn.
                </p>
              </div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#be185d' }}>
                Tổng ví riêng: {personalTotal.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="expense-list">
              {personalExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                  <Wallet size={48} color="#f472b6" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Ví riêng của bạn đang trống</p>
                  <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                    Ghi lại các khoản mua sắm quà lưu niệm, đồ dùng cá nhân trong chuyến đi mà không lo bị tính vào quỹ chung của nhóm.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ background: '#db2777' }}
                    onClick={() => setShowPersonalForm(true)}
                  >
                    + Thêm chi tiêu riêng đầu tiên
                  </button>
                </div>
              ) : (
                personalExpenses.map(ex => (
                  <div className="expense-item" key={ex.id} style={{ borderColor: '#fbcfe8', background: '#fff' }}>
                    {ex.imageUrl ? (
                      <img
                        src={getMediaUrl(ex.imageUrl)}
                        alt="Receipt"
                        className="receipt-thumb"
                        onClick={() => setPreviewImage(getMediaUrl(ex.imageUrl))}
                        title="Bấm để xem ảnh lớn"
                      />
                    ) : (
                      <div className="ex-icon c2" style={{ background: '#fdf2f8', color: '#db2777' }}>
                        👛
                      </div>
                    )}
                    <div className="ex-info">
                      <div className="ex-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {ex.description}
                        <span className="personal-badge-tag">Ví riêng</span>
                      </div>
                      <div className="ex-desc" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span>Ngày chi: {new Date(ex.expenseDate).toLocaleDateString('vi-VN')}</span>
                        {ex.imageUrl && (
                          <span
                            onClick={() => setPreviewImage(getMediaUrl(ex.imageUrl))}
                            style={{ color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <ImageIcon size={13} /> Xem hóa đơn
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="ex-amount" style={{ color: '#be185d' }}>
                        {ex.amount.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleOpenEdit(ex)}
                          title="Chỉnh sửa"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 6 }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(ex.id, true)}
                          title="Xóa"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6, borderRadius: 6 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT EXPENSE */}
      {editingExpense && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0 }}>Chỉnh sửa khoản chi phí</h3>
              <button onClick={() => setEditingExpense(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateExpense}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 4 }}>Tên khoản chi</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 4 }}>Số tiền (VNĐ)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  required
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 4 }}>Ngày chi</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.expenseDate}
                  onChange={e => setEditForm({ ...editForm, expenseDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingExpense(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW IMAGE */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImage}
              alt="Receipt Large"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }}
            />
            <button
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: -12, right: -12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
