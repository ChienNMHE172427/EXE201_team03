import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Minus,
  Luggage, 
  Shirt, 
  FileText, 
  Smartphone, 
  HeartPulse, 
  Smile, 
  Package, 
  Loader2,
  Search,
  X,
  Users,
  User,
  UserX,
  ChevronDown,
  Layers,
  Check
} from 'lucide-react';
import api from '../services/api';

const DEFAULT_CATEGORIES = [
  'Quần áo & Trang phục',
  'Giấy tờ & Tiền mặt',
  'Đồ điện tử & Công nghệ',
  'Y tế & Sức khỏe',
  'Đồ dùng cá nhân',
  'Vật dụng khác'
];

const CATEGORY_ICONS = {
  'Quần áo & Trang phục': <Shirt className="w-4 h-4 text-indigo-500" />,
  'Giấy tờ & Tiền mặt': <FileText className="w-4 h-4 text-amber-500" />,
  'Đồ điện tử & Công nghệ': <Smartphone className="w-4 h-4 text-blue-500" />,
  'Y tế & Sức khỏe': <HeartPulse className="w-4 h-4 text-rose-500" />,
  'Đồ dùng cá nhân': <Smile className="w-4 h-4 text-teal-500" />,
  'Vật dụng khác': <Package className="w-4 h-4 text-slate-500" />
};

const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category] || <Luggage className="w-4 h-4 text-emerald-500" />;
};

const getAvatarUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5300/api').replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const PackingList = ({ tripId }) => {
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all', 'mine', 'shared'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'

  // Add Item form state
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemIsShared, setNewItemIsShared] = useState(false);
  const [newItemAssigneeId, setNewItemAssigneeId] = useState('');

  // Dropdown Assignee popup
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/User/profile');
        setCurrentUser(res.data);
      } catch {
        const stored = localStorage.getItem('user');
        if (stored) setCurrentUser(JSON.parse(stored));
      }
    };
    fetchUser();
  }, []);

  // Fetch packing items & trip members
  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [itemsRes, membersRes] = await Promise.all([
        api.get(`/trips/${tripId}/packing`),
        api.get(`/trips/${tripId}/members`).catch(() => ({ data: [] }))
      ]);
      setItems(itemsRes.data || []);
      
      const validMembers = (membersRes.data || []).filter(
        m => m.status === 'Accepted' || m.role === 'Host'
      );
      setMembers(validMembers);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hành lý:', err);
      setErrorMsg('Không thể tải danh sách hành lý của chuyến đi.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Toggle Check
  const handleToggleCheck = async (id) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    ));

    try {
      await api.put(`/trips/${tripId}/packing/${id}/toggle`);
    } catch (err) {
      console.error('Lỗi khi toggle check:', err);
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      ));
    }
  };

  // 2. Cập nhật số lượng (+ / -)
  const handleUpdateQuantity = async (item, delta) => {
    const currentQty = item.quantity || 1;
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

    try {
      await api.put(`/trips/${tripId}/packing/${item.id}`, {
        itemName: item.itemName,
        category: item.category,
        quantity: newQty,
        isShared: item.isShared,
        assigneeId: item.assigneeId,
        isChecked: item.isChecked
      });
    } catch (err) {
      console.error('Lỗi cập nhật số lượng:', err);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: currentQty } : i));
    }
  };

  // 3. Đổi phân loại Đồ nhóm / Cá nhân
  const handleToggleShared = async (item) => {
    const newShared = !item.isShared;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isShared: newShared } : i));

    try {
      await api.put(`/trips/${tripId}/packing/${item.id}`, {
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity || 1,
        isShared: newShared,
        assigneeId: item.assigneeId,
        isChecked: item.isChecked
      });
    } catch (err) {
      console.error('Lỗi cập nhật loại đồ:', err);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isShared: item.isShared } : i));
    }
  };

  // 4. Phân công người mang đồ (Assignee)
  const handleAssignMember = async (item, memberUserId) => {
    setOpenDropdownId(null);
    const targetMember = members.find(m => m.id === memberUserId);
    const prevAssigneeId = item.assigneeId;
    const prevAssigneeName = item.assigneeName;
    const prevAssigneeAvatar = item.assigneeAvatarUrl;

    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i,
      assigneeId: memberUserId || null,
      assigneeName: targetMember ? targetMember.name : null,
      assigneeAvatarUrl: targetMember ? targetMember.avatarUrl : null
    } : i));

    try {
      await api.put(`/trips/${tripId}/packing/${item.id}`, {
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity || 1,
        isShared: item.isShared,
        assigneeId: memberUserId || null,
        isChecked: item.isChecked
      });
    } catch (err) {
      console.error('Lỗi khi phân công thành viên:', err);
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        assigneeId: prevAssigneeId,
        assigneeName: prevAssigneeName,
        assigneeAvatarUrl: prevAssigneeAvatar
      } : i));
      alert(err.response?.data?.message || 'Không thể phân công thành viên này.');
    }
  };

  // 5. Thêm món đồ thủ công
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const payload = {
        itemName: newItemName.trim(),
        category: newItemCategory,
        quantity: Math.max(1, parseInt(newItemQuantity, 10) || 1),
        isShared: newItemIsShared,
        assigneeId: newItemAssigneeId ? parseInt(newItemAssigneeId, 10) : null
      };

      const res = await api.post(`/trips/${tripId}/packing`, payload);
      setItems(prev => [...prev, res.data]);
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemIsShared(false);
      setNewItemAssigneeId('');
      setIsAdding(false);
    } catch (err) {
      console.error('Lỗi khi thêm đồ:', err);
      alert(err.response?.data?.message || 'Không thể thêm món đồ.');
    }
  };

  // 6. Xóa món đồ
  const handleDeleteItem = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món đồ này?')) return;
    try {
      await api.delete(`/trips/${tripId}/packing/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa món đồ:', err);
      alert('Không thể xóa món đồ.');
    }
  };

  // 7. Gợi ý hành lý thông minh bằng AI
  const handleSuggestAi = async () => {
    setIsAiLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/trips/${tripId}/packing/suggest`);
      setItems(res.data);
    } catch (err) {
      console.error('Lỗi khi gọi gợi ý AI:', err);
      setErrorMsg('Lỗi khi AI phân tích hành lý. Vui lòng thử lại sau.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Thống kê tiến độ chung
  const totalCount = items.length;
  const completedCount = items.filter(i => i.isChecked).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Xử lý Lọc & Tìm kiếm
  const currentUserId = currentUser?.id || currentUser?.userId;

  const filteredItems = items.filter(item => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchName = item.itemName?.toLowerCase().includes(query);
      const matchCat = item.category?.toLowerCase().includes(query);
      const matchAssignee = item.assigneeName?.toLowerCase().includes(query);
      if (!matchName && !matchCat && !matchAssignee) return false;
    }

    // 2. Scope Tabs: 'all', 'mine', 'shared'
    if (scopeFilter === 'mine') {
      if (currentUserId && item.assigneeId !== currentUserId) return false;
      if (!currentUserId && item.assigneeName !== currentUser?.fullName && item.assigneeName !== currentUser?.name) return false;
    } else if (scopeFilter === 'shared') {
      if (!item.isShared) return false;
    }

    // 3. Status Filter: 'all', 'pending', 'completed'
    if (statusFilter === 'pending' && item.isChecked) return false;
    if (statusFilter === 'completed' && !item.isChecked) return false;

    return true;
  });

  // Nhóm theo Category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Vật dụng khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-3" />
        <span className="text-slate-600 font-medium">Đang đồng bộ Workspace Hành lý...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100 shrink-0">
            <Luggage className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Workspace Hành lý Thông minh</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quản lý checklist, phân công mang đồ và gợi ý cùng Gemini AI</p>
          </div>
        </div>

        {/* Nút hành động: Gợi ý bằng AI + Thêm đồ mới */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSuggestAi}
            disabled={isAiLoading}
            className="whitespace-nowrap flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: '#ffffff'
            }}
          >
            {isAiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                <span className="text-xs sm:text-sm font-semibold text-white">AI đang phân tích...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0 text-amber-200" />
                <span className="text-xs sm:text-sm font-semibold text-white">✨ Gợi ý bằng AI</span>
              </>
            )}
          </button>

          {/* Nút Thêm đồ mới: Nền trắng, viền rõ ràng, text màu đen */}
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover:bg-slate-100 shadow-sm"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #0f172a'
            }}
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>Thêm đồ mới</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Form thêm món đồ thủ công */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="bg-white border-2 border-teal-500/40 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" /> Thêm món đồ mới vào hành lý
            </span>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tên món đồ */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên món đồ *</label>
              <input
                type="text"
                placeholder="VD: Áo khoác chống gió, Kem chống nắng, Sạc đa năng..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-teal-500 focus:bg-white text-sm text-slate-800 transition"
                autoFocus
                required
              />
            </div>

            {/* Phân loại */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-teal-500 focus:bg-white text-sm text-slate-700 transition"
              >
                {DEFAULT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Số lượng */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số lượng</label>
              <input
                type="number"
                min="1"
                max="99"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-teal-500 focus:bg-white text-sm text-slate-800 transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* Checkbox Đồ nhóm */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newItemIsShared}
                  onChange={(e) => setNewItemIsShared(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-slate-700">👥 Đồ dùng chung cho cả nhóm</span>
              </label>

              {/* Phân công thành viên */}
              {members.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Gán cho:</span>
                  <select
                    value={newItemAssigneeId}
                    onChange={(e) => setNewItemAssigneeId(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none text-slate-700"
                  >
                    <option value="">Chưa phân công</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                Thêm món đồ
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Tiến độ & Toolbar 2 Hàng (Không chèn đè chữ) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Luggage className="w-4 h-4 text-teal-600" />
              Tiến độ chuẩn bị hành lý
            </span>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              {completedCount}/{totalCount} món hoàn tất ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* HÀNG 1: Tabs bộ lọc phạm vi (Bên trái) + Nút trạng thái (Bên phải) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Bên trái: Tabs bộ lọc */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Tất cả ({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'mine'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Đồ của tôi</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter('shared')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'shared'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Đồ dùng chung</span>
            </button>
          </div>

          {/* Bên phải: Lọc Chưa soạn / Đã xong */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa soạn
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã xong
            </button>
          </div>
        </div>

        {/* HÀNG 2: Thanh Search input DÀI FULL WIDTH (w-full) - Tuyệt đối không chèn lên text */}
        <div className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh tên món đồ, danh mục hoặc người chịu trách nhiệm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-teal-500 focus:bg-white text-slate-800 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. AI Loading Skeleton */}
      {isAiLoading && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3 text-teal-800 text-sm animate-pulse shadow-sm">
            <Sparkles className="w-5 h-5 animate-spin text-teal-600 shrink-0" />
            <span>Gemini AI đang phân tích địa hình, dự báo thời tiết và thời gian chuyến đi để phân chia danh mục hành lý thông minh...</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-3">
                <div className="h-5 bg-slate-200 rounded-lg w-1/3"></div>
                <div className="space-y-2">
                  <div className="h-10 bg-slate-100 rounded-xl"></div>
                  <div className="h-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Danh sách Hành lý hiển thị dạng Card phân nhóm */}
      {Object.keys(groupedItems).length === 0 && !isAiLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <Luggage className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">
            {searchQuery || scopeFilter !== 'all' || statusFilter !== 'all' 
              ? 'Không tìm thấy món đồ phù hợp bộ lọc' 
              : 'Chưa có món đồ nào trong hành lý'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || scopeFilter !== 'all' || statusFilter !== 'all'
              ? 'Hãy thử xóa từ khóa tìm kiếm hoặc bấm nút "Xóa bộ lọc" bên dưới.'
              : 'Hãy sử dụng tính năng "Gợi ý bằng AI" để tự động tạo danh sách thông minh theo thời tiết và điểm đến!'}
          </p>
          {(searchQuery || scopeFilter !== 'all' || statusFilter !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setScopeFilter('all');
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-300"
            >
              Xóa bộ lọc
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSuggestAi}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md transition text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Gợi ý hành lý bằng AI</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(groupedItems).map(([category, catItems]) => {
            const catCompleted = catItems.filter(i => i.isChecked).length;
            const catTotal = catItems.length;

            return (
              <div 
                key={category} 
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3 hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <h3 className="font-bold text-slate-800 text-sm">{category}</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {catCompleted}/{catTotal}
                    </span>
                  </div>

                  {/* Item List: Cấu trúc cố định, không bị xô lệch */}
                  <div className="space-y-2">
                    {catItems.map(item => {
                      const isDropdownOpen = openDropdownId === item.id;

                      return (
                        <div 
                          key={item.id}
                          className={`relative flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all duration-150 group ${
                            item.isChecked 
                              ? 'bg-slate-50/70 border-slate-200/80 opacity-80' 
                              : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-xs'
                          }`}
                        >
                          {/* 1. Khu vực Tên món đồ + Badge: Chiếm flex-1 min-w-0, truncate không tràn lề */}
                          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleToggleCheck(item.id)}
                              className="shrink-0 text-slate-300 hover:text-teal-600 transition"
                            >
                              {item.isChecked ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 group-hover:text-teal-500" />
                              )}
                            </button>

                            {/* Tên món đồ: BẮT BUỘC truncate */}
                            <span 
                              className={`truncate text-xs sm:text-sm font-semibold select-none ${
                                item.isChecked ? 'line-through text-slate-400 font-normal' : 'text-slate-800'
                              }`}
                              title={item.itemName}
                            >
                              {item.itemName}
                            </span>

                            {/* Badge Đồ nhóm / Cá nhân */}
                            <button
                              type="button"
                              onClick={() => handleToggleShared(item)}
                              title="Bấm để đổi loại đồ dùng"
                              className={`shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md border transition hover:scale-105 ${
                                item.isShared 
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {item.isShared ? (
                                <>
                                  <Users className="w-3 h-3 text-indigo-600" />
                                  <span>Nhóm</span>
                                </>
                              ) : (
                                <>
                                  <User className="w-3 h-3 text-slate-500" />
                                  <span>Riêng</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* 2. Cụm Action: Chiều rộng cố định w-[205px], shrink-0 */}
                          <div className="w-[205px] flex items-center justify-end shrink-0 gap-2">
                            {/* Bộ đếm số lượng (+ / -) */}
                            <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 p-0.5 shrink-0 shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item, -1)}
                                disabled={(item.quantity || 1) <= 1}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Giảm số lượng"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              
                              <span className="w-5 text-center text-xs font-bold text-slate-800 select-none">
                                {item.quantity || 1}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
                                title="Tăng số lượng"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Nút Gán người: Độ tương phản cao, viền rõ ràng */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenDropdownId(isDropdownOpen ? null : item.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border transition shadow-xs ${
                                  item.assigneeId
                                    ? 'bg-teal-50 border-teal-300 text-teal-900 hover:bg-teal-100'
                                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                }`}
                                title="Phân công người mang"
                              >
                                {item.assigneeId ? (
                                  <>
                                    {item.assigneeAvatarUrl ? (
                                      <img 
                                        src={getAvatarUrl(item.assigneeAvatarUrl)} 
                                        alt={item.assigneeName} 
                                        className="w-4 h-4 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                        {item.assigneeName ? item.assigneeName.charAt(0).toUpperCase() : 'U'}
                                      </div>
                                    )}
                                    <span className="max-w-[70px] truncate text-[11px]">
                                      {item.assigneeName || 'Thành viên'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[11px] text-slate-700">Gán người</span>
                                  </>
                                )}
                                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                              </button>

                              {/* Assignee Dropdown Menu */}
                              {isDropdownOpen && (
                                <div 
                                  ref={dropdownRef}
                                  className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <div className="px-2 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Người chịu trách nhiệm
                                  </div>

                                  {/* Bỏ phân công */}
                                  <button
                                    type="button"
                                    onClick={() => handleAssignMember(item, null)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                                      !item.assigneeId ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <UserX className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Chưa phân công</span>
                                    {!item.assigneeId && <Check className="w-3.5 h-3.5 ml-auto text-teal-600" />}
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  {/* Danh sách thành viên */}
                                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                                    {members.length === 0 ? (
                                      <div className="px-2 py-2 text-xs text-slate-400 text-center">
                                        Chưa có thành viên nào khác
                                      </div>
                                    ) : (
                                      members.map(m => {
                                        const isSelected = item.assigneeId === m.id;
                                        return (
                                          <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => handleAssignMember(item, m.id)}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                                              isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            {m.avatarUrl ? (
                                              <img 
                                                src={getAvatarUrl(m.avatarUrl)} 
                                                alt={m.name} 
                                                className="w-5 h-5 rounded-full object-cover shrink-0"
                                              />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {m.initials || m.name?.charAt(0).toUpperCase() || 'M'}
                                              </div>
                                            )}
                                            <div className="flex-1 truncate">
                                              <div className="truncate text-xs font-medium">{m.name}</div>
                                              <div className="text-[10px] text-slate-400">{m.role === 'Host' ? '👑 Chủ chuyến' : 'Thành viên'}</div>
                                            </div>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Xóa món đồ */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                              title="Xóa món này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PackingList;
