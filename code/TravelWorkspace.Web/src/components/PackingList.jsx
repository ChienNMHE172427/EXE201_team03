import React, { useState, useEffect } from 'react';
import { 
  Shirt, 
  FileText, 
  Smartphone, 
  HeartPulse, 
  Smile, 
  Package, 
  Check,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import api from '../services/api';

const CATEGORIES = [
  { name: 'Quần áo & Trang phục', icon: Shirt },
  { name: 'Giấy tờ & Tiền mặt', icon: FileText },
  { name: 'Đồ điện tử & Công nghệ', icon: Smartphone },
  { name: 'Y tế & Sức khỏe', icon: HeartPulse },
  { name: 'Đồ dùng cá nhân', icon: Smile },
  { name: 'Vật dụng khác', icon: Package }
];

const PackingList = ({ tripId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/${tripId}/packing`);
      setItems(res.data || []);
      
      // Khởi tạo mở tất cả các mục
      const initialExpanded = {};
      CATEGORIES.forEach(cat => {
        initialExpanded[cat.name] = true;
      });
      setExpandedCategories(initialExpanded);
    } catch (err) {
      console.error('Lỗi khi tải hành lý:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheck = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Cập nhật giao diện ngay lập tức
    setItems(prev => prev.map(i => i.id === id ? { ...i, isChecked: !i.isChecked } : i));
    
    try {
      await api.put(`/trips/${tripId}/packing/${id}/toggle`);
    } catch (err) {
      // Hoàn tác nếu lỗi
      setItems(prev => prev.map(i => i.id === id ? { ...i, isChecked: !i.isChecked } : i));
    }
  };

  const handleAddItem = async (categoryName) => {
    const name = inputs[categoryName]?.trim();
    if (!name) return;

    try {
      const res = await api.post(`/trips/${tripId}/packing`, {
        itemName: name,
        category: categoryName,
        quantity: 1,
        isShared: false,
        assigneeId: null
      });
      setItems(prev => [...prev, res.data]);
      setInputs(prev => ({ ...prev, [categoryName]: '' }));
    } catch (err) {
      console.error('Lỗi thêm đồ:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await api.delete(`/trips/${tripId}/packing/${id}`);
    } catch (err) {
      console.error('Lỗi xóa đồ:', err);
      loadData(); 
    }
  };

  const handleSuggestAi = async () => {
    setIsAiLoading(true);
    try {
      const res = await api.post(`/trips/${tripId}/packing/suggest`);
      setItems(res.data);
    } catch (err) {
      console.error('Lỗi AI:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
        Đang tải danh sách...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      
      {/* Nút AI */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
        <button 
          onClick={handleSuggestAi}
          disabled={isAiLoading}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isAiLoading ? 0.7 : 1 }}
        >
          <Sparkles size={18} />
          <span>{isAiLoading ? 'AI đang gợi ý...' : 'AI Gợi ý tự động'}</span>
        </button>
      </div>

      {/* Danh sách accordion chia 2 cột */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', alignItems: 'start' }}>
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat.name || (!i.category && cat.name === 'Vật dụng khác'));
          const Icon = cat.icon;
          const isExpanded = expandedCategories[cat.name];
          const completedCount = catItems.filter(i => i.isChecked).length;
          
          return (
            <div 
              key={cat.name} 
              style={{ 
                background: 'var(--color-white)', 
                borderRadius: 'var(--radius-md)', 
                boxShadow: 'var(--shadow-sm)', 
                border: '1px solid var(--color-border)',
                overflow: 'hidden'
              }}
            >
              {/* Header của category (Click để mở/đóng) */}
              <button 
                onClick={() => toggleCategory(cat.name)}
                style={{ 
                  width: '100%', 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={22} color="var(--color-primary-dark)" />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                    {cat.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-muted)' }}>
                    {completedCount}/{catItems.length}
                  </span>
                  <ChevronDown 
                    size={20} 
                    color="var(--color-text-muted)" 
                    style={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }} 
                  />
                </div>
              </button>

              {/* Nội dung danh sách (Ghi chú) */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    
                    {catItems.map(item => (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'var(--color-bg-light)',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          const btn = e.currentTarget.querySelector('.delete-btn');
                          if(btn) btn.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const btn = e.currentTarget.querySelector('.delete-btn');
                          if(btn) btn.style.opacity = '0';
                        }}
                      >
                        <button 
                          onClick={() => handleToggleCheck(item.id)}
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            borderRadius: '4px', 
                            border: item.isChecked ? 'none' : '2px solid #ccc',
                            background: item.isChecked ? 'var(--color-primary-dark)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {item.isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
                        </button>
                        
                        <span 
                          onClick={() => handleToggleCheck(item.id)}
                          style={{ 
                            flex: 1, 
                            fontSize: '15px', 
                            color: item.isChecked ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                            textDecoration: item.isChecked ? 'line-through' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {item.itemName}
                        </span>
                        
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ 
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {catItems.length === 0 && (
                      <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)', padding: '12px 0' }}>
                        Chưa có ghi chú nào
                      </div>
                    )}
                  </div>
                  
                  {/* Ô thêm mới */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                    <Plus size={20} color="var(--color-text-muted)" />
                    <input 
                      type="text"
                      placeholder="Thêm vào danh sách..."
                      value={inputs[cat.name] || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [cat.name]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(cat.name);
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '15px',
                        color: 'var(--color-text-main)'
                      }}
                    />
                    <button 
                      onClick={() => handleAddItem(cat.name)}
                      disabled={!inputs[cat.name]?.trim()}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: inputs[cat.name]?.trim() ? 'pointer' : 'default',
                        opacity: inputs[cat.name]?.trim() ? 1 : 0.3,
                        color: 'var(--color-primary-dark)'
                      }}
                    >
                      <Check size={20} />
                    </button>
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default PackingList;
