import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import { getDestinationImage, matchDestination } from '../utils/destinationImages';
import ExploreServiceDrawer from '../components/ExploreServiceDrawer';
import InviteMemberModal from '../components/InviteMemberModal';
import TemplateSuggestModal from '../components/TemplateSuggestModal';
import TemplatePreviewModal from '../components/TemplatePreviewModal';
import CloneTripModal from '../components/CloneTripModal';
import { UserPlus, Sparkles, Flame, Layers, Eye } from 'lucide-react';
import './ItineraryPage.css';

const ItineraryPage = () => {
  const { tripId: paramTripId } = useParams();
  const [cloneToast, setCloneToast] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const getMapQuery = (item) => {
    let query = item.location || '';
    if (item.destination && item.destination !== 'Vui lòng chọn dịch vụ') {
      query = `${item.destination}, ${item.location}`;
    } else if (item.title && !item.title.toLowerCase().includes('khởi hành') && !item.title.toLowerCase().includes('đến')) {
      query = `${item.title}, ${item.location}`;
    }
    return encodeURIComponent(query.trim());
  };

  // Helper kiểm tra hoạt động đã qua thời gian hoặc đã hoàn thành
  const isItemPassed = (item, currentDate = new Date()) => {
    if (!item) return false;

    // Điều kiện 1: Trạng thái là "Đã hoàn thành" (hoặc giá trị tương đương)
    const statusStr = (item.status || '').trim().toLowerCase();
    if (statusStr === 'đã hoàn thành' || statusStr === 'hoàn thành' || statusStr === 'completed') {
      return true;
    }

    // Điều kiện 2: Thời gian kết thúc hoạt động nhỏ hơn thời gian hiện tại
    try {
      let endTimeDate = null;
      if (item.endTime) {
        const parsed = new Date(item.endTime);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
          endTimeDate = parsed;
        }
      }
      
      // Nếu không có endTime hợp lệ, fallback sang startTime
      if (!endTimeDate && item.startTime) {
        const parsedStart = new Date(item.startTime);
        if (!isNaN(parsedStart.getTime()) && parsedStart.getFullYear() > 1970) {
          endTimeDate = parsedStart;
        }
      }

      if (endTimeDate && endTimeDate < currentDate) {
        return true;
      }
    } catch (err) {
      console.error('Lỗi khi so sánh thời gian hoạt động:', err);
    }

    return false;
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(() => {
    if (paramTripId) return parseInt(paramTripId);
    return localStorage.getItem('currentTripId') ? parseInt(localStorage.getItem('currentTripId')) : null;
  });
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lắng nghe paramTripId từ đường dẫn URL (/itinerary/:tripId)
  useEffect(() => {
    if (paramTripId) {
      const parsedId = parseInt(paramTripId);
      if (!isNaN(parsedId)) {
        setSelectedTripId(parsedId);
        localStorage.setItem('currentTripId', parsedId);
      }
    }
  }, [paramTripId]);

  // Lắng nghe Toast thông báo nhân bản thành công
  useEffect(() => {
    const toast = location.state?.message || localStorage.getItem('cloneSuccessToast');
    if (toast) {
      setCloneToast(toast);
      localStorage.removeItem('cloneSuccessToast');
      const timer = setTimeout(() => setCloneToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Quản lý Template Lịch trình Mẫu
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewTemplateTrip, setPreviewTemplateTrip] = useState(null);
  const [cloneTemplateTrip, setCloneTemplateTrip] = useState(null);
  const [publicTemplates, setPublicTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Tự động tải danh sách Template công khai
  useEffect(() => {
    const fetchPublicTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const res = await api.get('/trips/public');
        const pub = (res.data || [])
          .filter(t => t.isPublic === true)
          .sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));
        setPublicTemplates(pub);
      } catch (err) {
        console.error('Lỗi khi tải template công khai:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchPublicTemplates();
  }, []);

  // Tự động mở Modal gợi ý Template nếu vừa tạo chuyến đi xong
  useEffect(() => {
    if (location.state?.justCreated) {
      const timer = setTimeout(() => {
        setShowTemplateModal(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [location.state?.justCreated]);

  // Handler khi áp dụng template thành công vào chuyến đi hiện tại
  const handleApplyTemplateSuccess = (appliedTemplate) => {
    if (selectedTripId) {
      fetchTripData(selectedTripId);
    }
    setCloneToast(`🎉 Đã áp dụng thành công lịch trình mẫu "${appliedTemplate.title}" vào chuyến đi của bạn!`);
    setShowTemplateModal(false);
  };

  const handleApplyDirectTemplate = async (targetTemplate) => {
    if (!selectedTripId) return;
    try {
      await api.post(`/trips/${selectedTripId}/apply-template/${targetTemplate.id}?overwrite=false`);
      handleApplyTemplateSuccess(targetTemplate);
    } catch (err) {
      console.error('Lỗi khi áp dụng template:', err);
      alert('Không thể áp dụng lịch trình mẫu lúc này. Vui lòng thử lại!');
    }
  };
  
  // For adding new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInfoItem, setSelectedInfoItem] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu'
  });
  // Chat AI
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(localStorage.getItem('geminiConnected') === 'true');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // Plan B Weather Backup State
  const [planBActiveDays, setPlanBActiveDays] = useState({});
  const [generatingPlanBDays, setGeneratingPlanBDays] = useState({});

  // Quản lý trạng thái mở rộng/thu gọn (Accordion) cho các thẻ hoạt động đã qua
  const [expandedPassedItems, setExpandedPassedItems] = useState({});

  // Quản lý Slide-out Drawer: Khám phá & Dịch vụ
  const [exploreData, setExploreData] = useState({ isOpen: false, activity: null });

  // Quản lý Modal Google Maps Embed & Gợi ý Ẩm thực AI & Khám phá địa điểm thực tế OSM
  const [foodMapModal, setFoodMapModal] = useState({
    isOpen: false,
    query: '',
    title: '',
    activityItem: null,
    aiSuggestions: [],
    loadingAi: false,
    errorAi: null,
    currentKeyword: ''
  });
  const [copiedFoodName, setCopiedFoodName] = useState(null);

  // State tìm kiếm địa điểm thực tế (Nominatim OpenStreetMap) & Tabs
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingRealPoi, setIsSearchingRealPoi] = useState(false);
  const [searchPoiError, setSearchPoiError] = useState(null);
  const [activeFoodTab, setActiveFoodTab] = useState('real'); // 'real' | 'ai'
  const [addingRestaurantKey, setAddingRestaurantKey] = useState(null);
  const [addedRestaurants, setAddedRestaurants] = useState({});
  const [foodModalToast, setFoodModalToast] = useState(null);

  // Trình khám phá động trên bản đồ (State tìm kiếm & Lọc nhanh)
  const [mapQuery, setMapQuery] = useState('restaurants');
  const [mapSearchInput, setMapSearchInput] = useState('');

  // Hàm đóng modal và dọn dẹp state
  const handleCloseFoodModal = () => {
    setFoodMapModal({
      isOpen: false,
      query: '',
      title: '',
      activityItem: null,
      aiSuggestions: [],
      loadingAi: false,
      errorAi: null,
      currentKeyword: ''
    });
    setSearchResults([]);
    setMapQuery('restaurants');
    setMapSearchInput('');
    setFoodModalToast(null);
    setSearchPoiError(null);
  };

  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && foodMapModal.isOpen) {
        handleCloseFoodModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [foodMapModal.isOpen]);

  // Debounce tìm kiếm địa điểm thực tế qua API Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!foodMapModal.isOpen) return;
    const query = mapSearchInput.trim();
    if (!query) {
      return;
    }

    const timer = setTimeout(() => {
      fetchRealPoiSuggestions(query, foodMapModal.query);
    }, 450);

    return () => clearTimeout(timer);
  }, [mapSearchInput, foodMapModal.isOpen, foodMapModal.query]);

  // Hàm gọi API Nominatim (OpenStreetMap) lấy địa điểm thực tế
  const fetchRealPoiSuggestions = async (kw, baseLocation) => {
    setIsSearchingRealPoi(true);
    setSearchPoiError(null);
    try {
      const fullQuery = `${kw} ${baseLocation || ''}`.trim();
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(fullQuery)}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi,en'
        }
      });
      if (!res.ok) throw new Error('Không thể kết nối Nominatim OSM');
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('Lỗi gọi Nominatim OSM:', err);
      setSearchPoiError('Không thể tải địa điểm thực tế lúc này.');
    } finally {
      setIsSearchingRealPoi(false);
    }
  };

  // Hàm gọi Gemini AI gợi ý địa điểm theo từ khóa và vị trí
  const fetchAISuggestions = async (keyword, baseLocation) => {
    const loc = baseLocation || foodMapModal.query || (trip?.destination || 'Việt Nam');
    const kw = (keyword && keyword !== 'restaurants') ? keyword : '';
    
    setFoodMapModal(prev => ({
      ...prev,
      loadingAi: true,
      errorAi: null,
      currentKeyword: keyword || ''
    }));

    try {
      const res = await api.get('/Itinerary/food-suggestions', {
        params: { 
          location: loc,
          keyword: kw
        }
      });
      setFoodMapModal(prev => ({
        ...prev,
        aiSuggestions: res.data || [],
        loadingAi: false
      }));
    } catch (err) {
      console.error('Lỗi khi tải gợi ý ẩm thực:', err);
      setFoodMapModal(prev => ({
        ...prev,
        loadingAi: false,
        errorAi: 'Không thể kết nối dịch vụ gợi ý ẩm thực AI lúc này.'
      }));
    }
  };

  // Hàm mở Modal Ẩm thực và kích hoạt cả 3 luồng (OSM, AI, Google Maps)
  const handleOpenFoodModal = (item) => {
    const targetQuery = item.location || item.destination || (trip?.destination ? `${item.title}, ${trip.destination}` : item.title);
    const formattedTitle = formatItemTitle(item.title);
    
    setMapQuery('restaurants');
    setMapSearchInput('');
    setActiveFoodTab('real');

    setFoodMapModal({
      isOpen: true,
      query: targetQuery,
      title: formattedTitle,
      activityItem: item,
      aiSuggestions: [],
      loadingAi: true,
      errorAi: null,
      currentKeyword: ''
    });

    fetchAISuggestions('', targetQuery);
    fetchRealPoiSuggestions('quán ăn', targetQuery);
  };

  // Thực thi tìm kiếm đồng bộ khi người dùng Enter hoặc click Thẻ lọc nhanh
  const handlePerformSearch = (keyword) => {
    const trimmed = (keyword || '').trim();
    const queryForMap = trimmed || 'restaurants';

    // Luồng 1 (Tức thì): Cập nhật URL bản đồ iframe Google Maps sang từ khóa mới
    setMapQuery(queryForMap);

    // Luồng 2 (Nominatim): Tìm kiếm địa điểm thật
    fetchRealPoiSuggestions(trimmed || 'quán ăn', foodMapModal.query);

    // Luồng 3 (AI): Lấy gợi ý phân tích từ Gemini
    fetchAISuggestions(trimmed, foodMapModal.query);
  };

  // Xử lý thêm nhà hàng/địa điểm vào lịch trình chuyến đi
  const handleAddRestaurantToItinerary = async (placeItem, source = 'real') => {
    if (!selectedTripId) {
      alert('Không tìm thấy chuyến đi để thêm hoạt động.');
      return;
    }

    const placeName = placeItem.name || placeItem.title || (placeItem.display_name ? placeItem.display_name.split(',')[0].trim() : 'Quán ăn');
    const placeAddress = placeItem.display_name || placeItem.location || placeItem.address || foodMapModal.query;
    const placeSpecialty = placeItem.specialty || (placeItem.type ? `Loại hình: ${placeItem.type}` : 'Ăn uống & Ẩm thực');
    const placeNotes = placeItem.reason || (placeItem.display_name ? `Địa chỉ: ${placeItem.display_name}` : '');
    const itemKey = `${placeName}-${source}`;

    setAddingRestaurantKey(itemKey);

    try {
      const payload = {
        date: foodMapModal.activityItem?.startTime || trip?.startDate || new Date().toISOString(),
        restaurantName: placeName,
        address: placeAddress,
        specialty: placeSpecialty,
        notes: placeNotes,
        lat: placeItem.lat ? String(placeItem.lat) : null,
        lon: placeItem.lon ? String(placeItem.lon) : null
      };

      await api.post(`/Itinerary/${selectedTripId}/add-restaurant`, payload);

      setAddedRestaurants(prev => ({ ...prev, [itemKey]: true }));
      setFoodModalToast(`Đã thêm "${placeName}" vào lịch trình!`);
      setTimeout(() => setFoodModalToast(null), 3500);

      // Cập nhật lại toàn bộ lịch trình chuyến đi
      if (selectedTripId) {
        fetchTripData(selectedTripId);
      }
    } catch (err) {
      console.error('Lỗi khi thêm nhà hàng vào lịch trình:', err);
      alert('Không thể thêm hoạt động vào lịch trình. Vui lòng thử lại.');
    } finally {
      setAddingRestaurantKey(null);
    }
  };

  // Focus bản đồ vào quán khi hover hoặc click thẻ
  const handlePreviewMap = (placeName) => {
    if (placeName && placeName !== mapQuery) {
      setMapQuery(placeName);
    }
  };

  const handleCopyFoodName = (name) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(name);
      setCopiedFoodName(name);
      setTimeout(() => setCopiedFoodName(null), 2000);
    }
  };

  const handleFocusMapRestaurant = (restaurantName) => {
    setMapQuery(restaurantName);
    setMapSearchInput(restaurantName);
  };

  const toggleExpandItem = (id) => {
    setExpandedPassedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);

        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          handleSelectTrip({ id: parseInt(tripIdFromUrl) });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const fetchTripData = async (id) => {
    try {
      const tripRes = await api.get(`/Trip/${id}`);
      setTrip(tripRes.data);

      const itemsRes = await api.get(`/Itinerary/${id}`);
      setItems(itemsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchTripData(selectedTripId);
      const savedMessages = localStorage.getItem(`chat_${selectedTripId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([{ role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }]);
      }
    }
  }, [selectedTripId]);

  useEffect(() => {
    if (selectedTripId) {
      localStorage.setItem(`chat_${selectedTripId}`, JSON.stringify(messages));
    }
  }, [messages, selectedTripId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    if (!newItem.startTime || !newItem.endTime) {
      alert('Vui lòng chọn Giờ & Ngày bắt đầu và kết thúc.');
      return;
    }

    try {
      const res = await api.post(`/Itinerary/${selectedTripId}`, newItem);
      setItems([...items, res.data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setShowAddForm(false);
      setNewItem({ title: '', location: '', notes: '', startTime: '', endTime: '', transport: '', assignee: '', status: 'Chưa bắt đầu' });
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.title) {
        alert('Lỗi: ' + err.response.data.title);
      } else {
        alert('Có lỗi khi thêm hoạt động. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Bạn có chắc muốn xóa hoạt động này?',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
        try {
          await api.delete(`/Itinerary/${id}`);
          setItems(items.filter(i => i.id !== id));
        } catch (err) {
          console.error(err);
          alert('Lỗi khi xóa.');
        }
      }
    });
  };

  const executeGenerateAi = async (overwrite = false) => {
    setIsChatting(true);
    try {
      const res = await api.post(`/Itinerary/GenerateAi/${selectedTripId}`, { overwrite });
      setItems(res.data);
      setMessages(prev => [...prev, { role: 'ai', content: 'Mình đã tạo lại toàn bộ lịch trình cho bạn rồi nhé!' }]);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setConfirmDialog({
          isOpen: true,
          type: 'confirm',
          message: 'Chuyến đi này đã có lịch trình. Bạn có chắc chắn muốn AI tạo lại từ đầu và xóa toàn bộ dữ liệu cũ không?',
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: null, type: 'confirm' });
            executeGenerateAi(true);
          }
        });
        return;
      }
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi tạo lịch trình AI.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleGenerateAi = () => {
    executeGenerateAi(false);
  };

  const handleTogglePlanB = async (dateStr, dayItems) => {
    const isCurrentlyActive = !!planBActiveDays[dateStr];

    if (isCurrentlyActive) {
      // Tắt Plan B -> quay về hiển thị lịch trình gốc
      setPlanBActiveDays(prev => ({ ...prev, [dateStr]: false }));
      return;
    }

    // Kiểm tra ngày này đã có Plan B item nào chưa
    const existingPlanB = dayItems.some(i => i.isPlanB);
    if (existingPlanB) {
      setPlanBActiveDays(prev => ({ ...prev, [dateStr]: true }));
      return;
    }

    // Nếu chưa có: Gọi API sinh Plan B
    setGeneratingPlanBDays(prev => ({ ...prev, [dateStr]: true }));
    try {
      const sampleItem = dayItems[0];
      const targetDate = sampleItem ? sampleItem.startTime : new Date().toISOString();
      
      const res = await api.post(`/trips/${selectedTripId}/itinerary/generate-plan-b`, {
        date: targetDate
      });

      const updatedDayItems = res.data.items || [];
      setItems(prevItems => {
        // Giữ lại các item của những ngày khác
        const otherDaysItems = prevItems.filter(i => new Date(i.startTime).toLocaleDateString('vi-VN') !== dateStr);
        return [...otherDaysItems, ...updatedDayItems].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      });

      setPlanBActiveDays(prev => ({ ...prev, [dateStr]: true }));
    } catch (err) {
      console.error('Error generating plan B:', err);
      alert(err.response?.data?.message || 'Không thể tạo phương án dự phòng thời tiết xấu vào lúc này.');
    } finally {
      setGeneratingPlanBDays(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const history = messages.filter(m => m.content !== 'Đang suy nghĩ...');
      const res = await api.post(`/Itinerary/ChatAi/${selectedTripId}`, { 
        message: userMessage,
        history: history 
      });
      const { reply, items: newItems } = res.data;
      
      setMessages(prev => [...prev, { role: 'ai', content: reply || 'Đã cập nhật lịch trình theo yêu cầu của bạn.' }]);
      setItems(newItems);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const updateItemStatus = async (item, newStatus) => {
    if (newStatus !== 'Chưa bắt đầu' && item.transport === 'Vui lòng chọn dịch vụ') {
      setConfirmDialog({ 
        isOpen: true, 
        message: 'Vui lòng chọn dịch vụ di chuyển trước khi lưu chặng này!', 
        onConfirm: null, 
        type: 'alert' 
      });
      return;
    }
    
    try {
      const updated = { ...item, status: newStatus };
      await api.put(`/Itinerary/${item.id}`, updated);
      setItems(items.map(i => i.id === item.id ? updated : i));

      // Tự động chuyển qua trang Chi phí kèm theo tên các dịch vụ
      if (newStatus === 'Đã chuẩn bị') {
        const services = [];
        if (item.transport && item.transport !== 'Vui lòng chọn dịch vụ') {
            services.push(item.transport);
        }
        if (item.notes) {
            const lines = item.notes.split('\n');
            lines.forEach(line => {
                if (line.includes(': ')) {
                    const parts = line.split(': ');
                    if (parts.length === 2) {
                        services.push(parts[1].trim());
                    }
                }
            });
        }
        
        if (services.length === 0) {
            services.push(formatItemTitle(item.title));
        }

        navigate(`/budget?tripId=${selectedTripId}&autoExpenses=${encodeURIComponent(JSON.stringify(services))}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTrip = (t) => {
    setSelectedTripId(t.id);
    localStorage.setItem('currentTripId', t.id);
  };

  const handleLoginGemini = () => {
    // Giả lập đăng nhập thành công
    localStorage.setItem('geminiConnected', 'true');
    setIsGeminiConnected(true);
    setMessages([{ role: 'ai', content: 'Đăng nhập thành công! Mình là Gemini, mình đã sẵn sàng giúp bạn lên lịch trình.' }]);
  };

  const handleLogoutGemini = () => {
    localStorage.removeItem('geminiConnected');
    setIsGeminiConnected(false);
    setMessages([{ role: 'ai', content: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp bạn tạo mới hoặc chỉnh sửa lịch trình theo ý muốn. Bạn muốn thay đổi gì nào?' }]);
  };

  const handleBack = () => {
    setSelectedTripId(null);
    setTrip(null);
    localStorage.removeItem('currentTripId');
  };

  if (loading) return <div className="page-container"><h2 style={{marginTop: 40}}>Đang tải...</h2></div>;

  if (!selectedTripId || !trip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quản lý lịch trình</h1>
            <p className="page-subtitle">Chọn một chuyến đi để xem và chỉnh sửa lịch trình chi tiết.</p>
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
                    + Mở lịch trình chi tiết
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    const dateStr = new Date(item.startTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Floating Clone Success Toast */}
      {cloneToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          background: 'linear-gradient(135deg, #122B29 0%, #1a423f 100%)',
          color: '#ffffff',
          border: '1.5px solid #d2f47d',
          boxShadow: '0 12px 32px rgba(18, 43, 41, 0.35)',
          padding: '14px 22px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 99999,
          fontSize: '14px',
          fontWeight: '600',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <span>{cloneToast}</span>
          <button 
            type="button"
            onClick={() => setCloneToast(null)} 
            style={{ marginLeft: '12px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {formatItemTitle(trip.title)}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#122B29',
              color: '#d2f47d',
              border: '1.5px solid rgba(210, 244, 125, 0.6)',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(18, 43, 41, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1a423f';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(18, 43, 41, 0.35)';
              e.currentTarget.style.borderColor = '#d2f47d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#122B29';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(18, 43, 41, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(210, 244, 125, 0.6)';
            }}
          >
            <Sparkles size={17} color="#d2f47d" strokeWidth={2.4} />
            <span>Template lịch trình mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1E6B65',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(30, 107, 101, 0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#122B29';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(18, 43, 41, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1E6B65';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(30, 107, 101, 0.3)';
            }}
          >
            <UserPlus size={18} color="#FFFFFF" strokeWidth={2.2} />
            <span style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '14px' }}>Mời thành viên</span>
          </button>
        </div>
      </div>

      {/* Removed page-header to save space */}

      <div className="wizard-steps-container">
        <div className="wizard-steps">
          <div className="step active">
            <div className="step-circle">1</div>
            <div className="step-info">
              <div className="step-title">Lịch trình</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/budget?tripId=${selectedTripId}`)}>
            <div className="step-circle">2</div>
            <div className="step-info">
              <div className="step-title">Chi phí nhóm</div>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/collaborate?tripId=${selectedTripId}`)}>
            <div className="step-circle">3</div>
            <div className="step-info">
              <div className="step-title">Cộng tác nhóm</div>
            </div>
          </div>
        </div>
      </div>


      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 500, padding: 32, borderRadius: 24, background: '#fff'}}>
            <h2 style={{ marginBottom: 24, fontSize: 24, color: 'var(--color-primary-dark)' }}>Thêm hoạt động mới</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Tiêu đề</label>
                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Địa điểm</label>
                <input type="text" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                <div className="form-group" style={{width: '100%'}}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Bắt đầu (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.startTime} onChange={e => setNewItem({...newItem, startTime: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                </div>
                <div className="form-group" style={{width: '100%'}}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Kết thúc (Giờ & Ngày)</label>
                  <input type="datetime-local" value={newItem.endTime} onChange={e => setNewItem({...newItem, endTime: e.target.value})} required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Ghi chú</label>
                <textarea rows="3" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', resize: 'vertical' }} onFocus={e => e.target.style.borderColor = 'var(--color-teal)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'}></textarea>
              </div>
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="split-layout">
        {/* Left pane: AI Chat */}
        <div className="chat-container">
          <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              {isGeminiConnected ? 'Gemini AI' : 'Trợ lý Lịch trình AI'}
            </span>
            {isGeminiConnected ? (
              <button 
                onClick={handleLogoutGemini}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            ) : null}
          </div>
          
          {!isGeminiConnected ? (
            <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <h3 style={{ marginBottom: 12 }}>Kết nối với Gemini</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Đăng nhập để sử dụng sức mạnh của Google Gemini cho chuyến đi của bạn.</p>
              <button className="btn-primary" onClick={handleLoginGemini}>
                Đăng nhập với Google
              </button>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((m, idx) => (
                  <div key={idx} className={`chat-bubble ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                {isChatting && (
                  <div className="chat-bubble ai">
                    Đang suy nghĩ...
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <button className="btn-explore-sm" onClick={handleGenerateAi} disabled={isChatting}>
                    🔄 Tạo mới toàn bộ lịch trình
                  </button>
                </div>
              </div>
              <div className="chat-input-area">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Ví dụ: Đổi lịch chiều ngày 2 thành đi ăn ốc..." 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isChatting}
                />
                <button className="btn-send" onClick={handleSendMessage} disabled={isChatting || !chatInput.trim()}>Gửi</button>
              </div>
            </>
          )}
        </div>

        {/* Right pane: Timeline Layout */}
        <div className="timeline-container">
          {items.length === 0 ? (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ 
                    backgroundColor: '#122B29', 
                    color: '#d2f47d', 
                    border: '1.5px solid rgba(210, 244, 125, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 700
                  }}
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Sparkles size={16} />
                  <span>Xem Template Lịch Trình Mẫu</span>
                </button>
                <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Thêm Hoạt động</button>
              </div>

              {/* Banner Gợi ý Template Mẫu Phù Hợp Cho Chuyến Đi */}
              {(() => {
                const matched = publicTemplates.filter(t => matchDestination(trip.destination, t.destination, t.title));
                const listToDisplay = matched.length > 0 ? matched : publicTemplates.slice(0, 3);

                if (listToDisplay.length === 0) return null;

                return (
                  <div className="suggested-templates-banner">
                    <div className="suggested-banner-badge">
                      <Sparkles size={12} />
                      <span>{matched.length > 0 ? 'GỢI Ý TỰ ĐỘNG THEO ĐIỂM ĐẾN' : 'TEMPLATE LỊCH TRÌNH MẪU ĐỀ XUẤT'}</span>
                    </div>
                    <h3 className="suggested-banner-title">
                      {matched.length > 0 
                        ? `Lịch trình mẫu đề xuất cho ${getShortLocation(trip.destination)}`
                        : `Gợi ý lịch trình mẫu du lịch hot nhất`}
                    </h3>
                    <p className="suggested-banner-subtitle">
                      Áp dụng các chặng và hoạt động mẫu vào ngay chuyến đi này chỉ với 1 click, hoặc tùy chỉnh thêm bớt theo ý muốn.
                    </p>

                    <div className="suggested-banner-grid">
                      {listToDisplay.map(tpl => {
                        const isMatch = matchDestination(trip.destination, tpl.destination, tpl.title);
                        const cover = getDestinationImage(tpl.destination, tpl.title, tpl.imageUrl);
                        return (
                          <div key={tpl.id} className="suggested-banner-card">
                            <div className="suggested-banner-card-img-wrap">
                              <img src={cover} alt={tpl.title} className="suggested-banner-card-img" />
                              {isMatch && (
                                <div className="suggested-banner-card-badge">
                                  <Sparkles size={10} />
                                  <span>Khớp điểm đến</span>
                                </div>
                              )}
                              <div className="suggested-banner-card-clones">
                                🔥 {tpl.cloneCount || 0} dùng
                              </div>
                            </div>
                            <div className="suggested-banner-card-body">
                              <h4 className="suggested-banner-card-title">{tpl.title}</h4>
                              <div className="suggested-banner-card-meta">
                                <span>📍 {getShortLocation(tpl.destination)}</span>
                                {tpl.numberOfParticipants && <span>👥 {tpl.numberOfParticipants} người</span>}
                              </div>
                              <div className="suggested-banner-card-actions">
                                <button
                                  type="button"
                                  className="suggested-banner-btn-apply"
                                  onClick={() => handleApplyDirectTemplate(tpl)}
                                >
                                  <Sparkles size={13} />
                                  <span>Áp dụng ngay</span>
                                </button>
                                <button
                                  type="button"
                                  className="suggested-banner-btn-preview"
                                  onClick={() => setPreviewTemplateTrip(tpl)}
                                >
                                  <Eye size={13} />
                                  <span>Xem trước</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.12)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: '#ffffff',
                          padding: '8px 20px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Flame size={14} color="#d2f47d" />
                        <span>Xem tất cả {publicTemplates.length} Template mẫu</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div style={{textAlign: 'center', padding: 48, background: 'transparent', border: '2px dashed #E5ECEB', borderRadius: 24}}>
                <div style={{fontSize: 48, marginBottom: 16}}>🗺️</div>
                <h3 style={{fontSize: 20, color: '#122B29', marginBottom: 8}}>Chưa có hoạt động nào trong lịch trình</h3>
                <p style={{color: '#6E807F', marginBottom: 20}}>Bạn có thể chọn một lịch trình mẫu ở trên để áp dụng ngay, hoặc bấm "Thêm Hoạt động" để tự lên kế hoạch thủ công.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button 
                    type="button"
                    className="btn-primary" 
                    onClick={() => setShowTemplateModal(true)}
                    style={{ background: '#122B29', color: '#d2f47d', border: '1px solid #d2f47d' }}
                  >
                    🔥 Mở Kho Template Mẫu
                  </button>
                  <button className="btn-secondary" onClick={() => setShowAddForm(true)}>+ Thêm Hoạt động</button>
                </div>
              </div>
            </div>
          ) : (
            Object.entries(groupedItems).map(([date, dayItems], groupIndex) => {
              const totalDays = Object.keys(groupedItems).length;
              let dayTitle = `Khám phá ${getShortLocation(trip.destination)}`;
              if (groupIndex === 0) {
                dayTitle = `Từ ${getShortLocation(trip.origin)} đi ${getShortLocation(trip.destination)}`;
              } else if (groupIndex === totalDays - 1) {
                dayTitle = `Từ ${getShortLocation(trip.destination)} về ${getShortLocation(trip.origin)}`;
              }

              const isPlanBActive = !!planBActiveDays[date];
              const isGenerating = !!generatingPlanBDays[date];

              // Logic hiển thị:
              // Khi Toggle ở trạng thái OFF: Chỉ filter và render các ItineraryItem có IsPlanB == false.
              // Khi Toggle ở trạng thái ON: Render trộn lẫn các hoạt động gốc không bị ảnh hưởng và các hoạt động Plan B.
              let displayedItems = [];
              if (!isPlanBActive) {
                displayedItems = dayItems.filter(item => !item.isPlanB);
              } else {
                const replacedIds = new Set(dayItems.filter(item => item.isPlanB && item.replacesItemId).map(item => item.replacesItemId));
                const unreplacedOriginals = dayItems.filter(item => !item.isPlanB && !replacedIds.has(item.id));
                const planBItems = dayItems.filter(item => item.isPlanB);
                displayedItems = [...unreplacedOriginals, ...planBItems].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
              }

              return (
                <div key={date} className="timeline-date-group">
                  <div className="timeline-date-header">
                    <div className="timeline-date-left">
                      <h3 className="timeline-date-title">{dayTitle}</h3>
                      <div className="timeline-date-subtitle">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                        Ngày: {date}
                      </div>
                    </div>
                    <div className="timeline-date-right">
                      {/* TOGGLE SWITCH NỔI BẬT: 🌧️ Kích hoạt Plan B (Thời tiết xấu) */}
                      <button
                        type="button"
                        className={`plan-b-toggle-btn ${isPlanBActive ? 'active' : ''}`}
                        onClick={() => handleTogglePlanB(date, dayItems)}
                        disabled={isGenerating}
                        title="Kích hoạt phương án thay thế hoạt động trong nhà khi thời tiết xấu"
                      >
                        <span>{isPlanBActive ? '☔' : '🌧️'}</span>
                        <span>{isPlanBActive ? 'Đang bật Plan B (Thời tiết xấu)' : '🌧️ Kích hoạt Plan B (Thời tiết xấu)'}</span>
                        <div className="plan-b-switch-pill">
                          <div className="plan-b-switch-thumb"></div>
                        </div>
                        {isGenerating && <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: 4 }}>Đang tạo...</span>}
                      </button>

                      <button className="btn-add-activity" onClick={() => setShowAddForm(true)}>
                        + Thêm Hoạt động
                      </button>
                    </div>
                  </div>
                
                <div className="timeline-list">
                  {displayedItems.map((item, index) => {
                    const passed = isItemPassed(item);
                    // Mặc định: các thẻ hoạt động trong quá khứ bị thu gọn (collapsed), chỉ mở rộng khi user click Chevron
                    const isExpanded = passed ? !!expandedPassedItems[item.id] : true;

                    return (
                      <div key={item.id} className={`timeline-item ${passed ? 'passed' : ''}`}>
                        <div 
                          className="timeline-dot" 
                          style={{
                            ...(item.isPlanB ? { background: '#0284c7', borderColor: '#e0f2fe' } : {}),
                            ...(passed ? { background: '#94a3b8', borderColor: '#e2e8f0', boxShadow: 'none' } : {})
                          }}
                        ></div>
                        <div className={`itinerary-card ${item.isPlanB ? 'plan-b' : ''} ${passed ? 'passed opacity-80 bg-slate-50' : ''} ${passed && !isExpanded ? 'collapsed' : ''}`}>
                            <div className="itinerary-card-header">
                              <div className="itinerary-time" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {passed && (
                                  <span className="passed-badge" title="Hoạt động đã kết thúc hoặc được đánh dấu hoàn thành">
                                    ✅ Đã qua
                                  </span>
                                )}
                                {item.isPlanB && <span title="Hoạt động dự phòng trong nhà (Plan B)">☔</span>}
                                {new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} 
                                {item.endTime && item.endTime !== item.startTime ? ` - ${new Date(item.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}` : ''}
                                {item.isPlanB && (
                                  <span className="plan-b-badge">
                                    ☔ Plan B (Trong nhà)
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Selective Disabling 1: Nút trạng thái / Lưu */}
                                {passed ? (
                                  <span 
                                    style={{ 
                                      padding: '4px 10px', 
                                      fontSize: '12px', 
                                      borderRadius: '6px', 
                                      background: '#ecfdf5', 
                                      color: '#059669', 
                                      border: '1px solid #a7f3d0',
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      userSelect: 'none'
                                    }}
                                    title="Hoạt động đã kết thúc trong quá khứ hoặc đã hoàn thành"
                                  >
                                    ✅ Đã hoàn thành
                                  </span>
                                ) : (
                                  <button 
                                    className={(!item.status || item.status === 'Chưa bắt đầu') ? 'btn-primary' : 'btn-secondary'} 
                                    style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px' }}
                                    onClick={async () => {
                                      if (!item.status || item.status === 'Chưa bắt đầu') {
                                        await updateItemStatus(item, 'Đã chuẩn bị');
                                      }
                                    }}
                                  >
                                    {(!item.status || item.status === 'Chưa bắt đầu') ? 'Lưu' : 'Đã lưu'}
                                  </button>
                                )}

                                {/* Nút Hỏi AI: Cho phép tương tác khi chưa qua */}
                                {!passed && (
                                  <button 
                                    className="btn-action-icon btn-ask-ai" 
                                    onClick={() => {
                                      setMessages(prev => [...prev, { role: 'ai', content: `Bạn muốn thay đổi gì ở giai đoạn "${formatItemTitle(item.title)}"?` }]);
                                      setTimeout(() => {
                                        const input = document.querySelector('.chat-input');
                                        if(input) input.focus();
                                      }, 100);
                                    }}
                                    title="Hỏi trợ lý AI"
                                  >
                                    ?
                                  </button>
                                )}

                                {/* Nút Xem thông tin chi tiết: LUÔN CHO PHÉP BẤM NGAY CẢ KHI ĐÃ QUA */}
                                <button 
                                  className="btn-action-icon btn-info" 
                                  onClick={() => {
                                    setSelectedInfoItem(item);
                                  }}
                                  title="Xem thông tin chi tiết"
                                >
                                  i
                                </button>

                                {/* Selective Disabling 2: Nút Xóa (Khóa khi hoạt động đã qua trong quá khứ) */}
                                <button 
                                  className={`btn-delete-icon ${passed ? 'disabled' : ''}`} 
                                  onClick={() => !passed && handleDelete(item.id)} 
                                  disabled={passed}
                                  title={passed ? "Không thể xóa hoạt động trong quá khứ" : "Xóa"}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>

                                {/* Nút Accordion Chevron: Mở rộng / Thu gọn cho các thẻ đã qua */}
                                {passed && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandItem(item.id)}
                                    className="btn-collapse-toggle"
                                    style={{
                                      background: isExpanded ? '#e2e8f0' : '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: '#475569',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      transition: 'all 0.2s',
                                      marginLeft: '2px'
                                    }}
                                    title={isExpanded ? "Thu gọn hoạt động" : "Mở rộng để xem bản đồ & dịch vụ"}
                                  >
                                    <span>{isExpanded ? "Thu gọn" : "Chi tiết"}</span>
                                    <svg 
                                      width="14" 
                                      height="14" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                      style={{ 
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s ease'
                                      }}
                                    >
                                      <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                          {/* Tiêu đề & Plan B Notes */}
                          <div className="itinerary-card-body" style={passed && !isExpanded ? { padding: 0 } : {}}>
                            <h4 className="itinerary-card-title">{formatItemTitle(item.title)}</h4>
                            {(!passed || isExpanded) && item.isPlanB && item.notes && (
                              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#0369a1', background: '#f0f9ff', padding: '6px 10px', borderRadius: 8, border: '1px solid #e0f2fe' }}>
                                💡 <b>Phương án Plan B:</b> {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Footer Bản đồ & Khám phá dịch vụ: Mở rộng khi chưa qua HOẶC khi đã click Chevron */}
                          {(!passed || isExpanded) && (
                            <div className="itinerary-card-footer">
                              <div className="itinerary-services">
                                {item.location && (
                                  <button className="service-btn map-btn" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${getMapQuery(item)}`, '_blank')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    Bản đồ
                                  </button>
                                )}
                                <button 
                                  className="service-btn" 
                                  onClick={() => handleOpenFoodModal(item)}
                                  title="Khám phá ẩm thực & nhà hàng do AI gợi ý quanh khu vực này"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
                                  Khám phá ẩm thực
                                </button>
                                <button 
                                  className="service-btn" 
                                  onClick={() => setExploreData({ isOpen: true, activity: { ...item, defaultCategory: 'Lưu trú', tripId: selectedTripId } })}
                                  title="Tìm kiếm khách sạn & nơi lưu trú"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                                  Tìm khách sạn
                                </button>
                                <button 
                                  className="service-btn" 
                                  onClick={() => setExploreData({ isOpen: true, activity: { ...item, defaultCategory: 'Di chuyển', tripId: selectedTripId } })}
                                  title="Gợi ý phương tiện & đối tác di chuyển"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v9c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
                                  Gợi ý đối tác
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
            })
          )}
        </div>
      </div>

      {selectedInfoItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{maxWidth: 400, padding: '32px', borderRadius: '24px', background: '#fff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--color-primary-dark)' }}>Thông tin chi tiết</h2>
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <p style={{ marginBottom: '8px' }}><strong>Tên hoạt động/Dịch vụ:</strong> <br/>{formatItemTitle(selectedInfoItem.title)}</p>
              <p style={{ marginBottom: '8px' }}><strong>Điểm đi:</strong> <br/>{getShortLocation(selectedInfoItem.location)}</p>
              <p style={{ marginBottom: '8px' }}><strong>Điểm đến:</strong> <br/>{selectedInfoItem.destination ? getShortLocation(selectedInfoItem.destination) : 'Vui lòng chọn dịch vụ'}</p>
              {selectedInfoItem.transport && <p style={{ marginBottom: '8px' }}><strong>Di chuyển:</strong> <br/>{selectedInfoItem.transport}</p>}
              {selectedInfoItem.notes && <p style={{ marginBottom: '8px' }}><strong>Ghi chú:</strong> <br/>{selectedInfoItem.notes}</p>}
            </div>
            <button className="btn-primary" onClick={() => setSelectedInfoItem(null)}>Đóng</button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{maxWidth: 400, padding: '32px', borderRadius: '24px', background: '#fff', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--color-primary-dark)' }}>
              {confirmDialog.type === 'alert' ? 'Thông báo' : 'Xác nhận'}
            </h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '16px', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {confirmDialog.type === 'alert' ? (
                <button className="btn-primary" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, type: 'confirm' })}>Đóng</button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, type: 'confirm' })}>Hủy</button>
                  <button className="btn-primary" style={{ backgroundColor: '#ef4444' }} onClick={confirmDialog.onConfirm}>Đồng ý</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Drawer: Khám phá & Dịch vụ */}
      <ExploreServiceDrawer
        isOpen={exploreData.isOpen}
        onClose={() => setExploreData({ isOpen: false, activity: null })}
        activityContext={exploreData.activity}
        trip={trip}
        onActivityUpdated={() => {
          if (selectedTripId) {
            fetchTripData(selectedTripId);
          }
        }}
      />

      {/* Modal Hybrid: Real POI Search & Add + AI Suggestions + Google Maps Embed */}
      {foodMapModal.isOpen && (
        <div 
          className="food-map-modal-overlay" 
          onClick={handleCloseFoodModal}
        >
          <div 
            className="food-map-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Toast Notification */}
            {foodModalToast && (
              <div className="food-modal-toast">
                <span style={{ fontSize: '15px' }}>✅</span>
                <span>{foodModalToast}</span>
              </div>
            )}

            <div className="food-map-modal-header">
              <div className="food-map-modal-title-group">
                <h3 className="food-map-modal-title">
                  <span>🍽️</span> Quán ăn & Ẩm thực xung quanh
                </h3>
                <p className="food-map-modal-subtitle">
                  Chặng: <strong>{foodMapModal.title || 'Lịch trình'}</strong> • Khu vực: <em>{foodMapModal.query}</em>
                </p>
              </div>
              <button 
                type="button" 
                className="food-map-modal-close"
                onClick={handleCloseFoodModal}
                title="Đóng (Esc)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Split Layout Body */}
            <div className="food-map-split-body">
              {/* Nửa bên trái: Khu vực Tìm kiếm & Gợi ý (Tabs: Thực tế vs AI) */}
              <div className="food-map-ai-panel">
                {/* 1. Thanh tìm kiếm & Lọc nhanh */}
                <div className="food-left-search-box">
                  <form 
                    className="food-map-search-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePerformSearch(mapSearchInput);
                    }}
                  >
                    <span className="food-map-search-icon">🔍</span>
                    <input
                      type="text"
                      className="food-map-search-input"
                      value={mapSearchInput}
                      onChange={(e) => setMapSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePerformSearch(mapSearchInput);
                        }
                      }}
                      placeholder="🔍 Gõ tìm quán ăn, cafe, siêu thị thực tế quanh đây..."
                    />
                    {mapSearchInput && (
                      <button 
                        type="button" 
                        className="food-map-search-clear"
                        onClick={() => {
                          setMapSearchInput('');
                          handlePerformSearch('restaurants');
                        }}
                        title="Xóa tìm kiếm"
                      >
                        ✕
                      </button>
                    )}
                    <button type="submit" className="food-map-search-btn">
                      Tìm
                    </button>
                  </form>

                  <div className="food-map-chips-row">
                    {[
                      { id: 'all', label: '🍽️ Quán ăn', query: 'restaurants', aiKeyword: '' },
                      { id: 'cafe', label: '☕ Cafe', query: 'cafe', aiKeyword: 'quán cafe' },
                      { id: 'veggie', label: '🥗 Đồ chay', query: 'đồ chay', aiKeyword: 'quán chay' },
                      { id: 'bar', label: '🍻 Quán nhậu', query: 'quán nhậu', aiKeyword: 'quán nhậu' },
                      { id: 'mart', label: '🛒 Cửa hàng tiện lợi', query: 'cửa hàng tiện lợi', aiKeyword: 'cửa hàng tiện lợi' }
                    ].map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        className={`food-map-chip ${mapQuery === chip.query ? 'active' : ''}`}
                        onClick={() => {
                          setMapSearchInput(chip.query === 'restaurants' ? '' : chip.label);
                          handlePerformSearch(chip.query);
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Bộ chuyển Tab: Thực tế (OSM) vs AI (Gemini) */}
                <div className="food-explorer-tabs">
                  <button
                    type="button"
                    className={`food-explorer-tab ${activeFoodTab === 'real' ? 'active' : ''}`}
                    onClick={() => setActiveFoodTab('real')}
                  >
                    📍 Địa điểm thực tế (OSM)
                    <span className="tab-count-badge">{searchResults.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`food-explorer-tab ${activeFoodTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveFoodTab('ai')}
                  >
                    ✨ AI Gợi ý (Gemini)
                    <span className="tab-count-badge">{foodMapModal.aiSuggestions.length}</span>
                  </button>
                </div>

                {/* 3. Nội dung Tab A: Kết quả tìm kiếm thực tế (Nominatim OpenStreetMap) */}
                {activeFoodTab === 'real' && (
                  <div className="food-tab-content">
                    <div className="food-tab-info-bar">
                      <span>🗺️ Dữ liệu địa điểm thực tế xác thực từ OpenStreetMap</span>
                      {isSearchingRealPoi && <span style={{ color: '#0284c7', fontWeight: '600' }}>⏳ Đang tìm...</span>}
                    </div>

                    {isSearchingRealPoi ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="food-skeleton-card">
                            <div className="skeleton-shimmer" style={{ height: '18px', width: '65%' }} />
                            <div className="skeleton-shimmer" style={{ height: '14px', width: '90%' }} />
                            <div className="skeleton-shimmer" style={{ height: '36px', width: '100%' }} />
                          </div>
                        ))}
                      </div>
                    ) : searchPoiError ? (
                      <div style={{ margin: '16px', padding: '20px', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>{searchPoiError}</p>
                        <button 
                          type="button" 
                          className="btn-food-action" 
                          onClick={() => fetchRealPoiSuggestions(mapSearchInput || 'quán ăn', foodMapModal.query)}
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ margin: '16px', padding: '32px 16px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px', color: '#64748b', fontSize: '13px' }}>
                        <p style={{ fontSize: '26px', margin: '0 0 6px 0' }}>📍</p>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#334155' }}>
                          Không tìm thấy địa điểm thực tế nào cho "{mapSearchInput || foodMapModal.query}"
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px' }}>
                          Hãy thử nhập tên quán cụ thể, hoặc chuyển sang tab <strong>AI Gợi ý</strong> để tham khảo.
                        </p>
                        <button 
                          type="button" 
                          className="btn-food-action" 
                          onClick={() => setActiveFoodTab('ai')}
                        >
                          ✨ Chuyển sang AI Gợi ý
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                        {searchResults.map((poi, idx) => {
                          const placeName = poi.name || poi.display_name.split(',')[0].trim();
                          const itemKey = `${placeName}-real`;
                          const isAdded = !!addedRestaurants[itemKey];
                          const isAdding = addingRestaurantKey === itemKey;

                          return (
                            <article 
                              key={poi.place_id || idx} 
                              className={`food-card ${mapQuery === placeName ? 'preview-active' : ''}`}
                              onMouseEnter={() => handlePreviewMap(placeName)}
                              onClick={() => handlePreviewMap(placeName)}
                              title="Click hoặc di chuột để xem vị trí trên bản đồ bên phải"
                            >
                              <div className="food-card-top">
                                <h4 className="food-card-name">{placeName}</h4>
                                <span className="food-card-type-badge">
                                  {poi.type === 'restaurant' ? '🍴 Nhà hàng' : poi.type === 'cafe' ? '☕ Cafe' : poi.type === 'bar' ? '🍻 Quán' : '📍 Địa điểm thực'}
                                </span>
                              </div>

                              <p className="food-card-address" title={poi.display_name}>
                                📍 {poi.display_name}
                              </p>

                              <div className="food-card-actions">
                                <button
                                  type="button"
                                  className={`btn-food-add ${isAdded ? 'added' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddRestaurantToItinerary(poi, 'real');
                                  }}
                                  disabled={isAdding}
                                  title="Lưu nhà hàng này thành hoạt động mới trong chuyến đi"
                                >
                                  {isAdding ? '⏳ Đang thêm...' : isAdded ? '✅ Đã thêm' : '➕ Thêm vào lịch trình'}
                                </button>

                                <button
                                  type="button"
                                  className="btn-food-action focus-map"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFocusMapRestaurant(placeName);
                                  }}
                                  title="Ghim bản đồ Google Maps bên cạnh"
                                >
                                  🗺️ Ghim bản đồ
                                </button>

                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.display_name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-food-action"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Chỉ đường trên Google Maps"
                                >
                                  🧭 Chỉ đường
                                </a>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Nội dung Tab B: Gợi ý từ Gemini AI (có dòng cảnh báo kiểm chứng) */}
                {activeFoodTab === 'ai' && (
                  <div className="food-tab-content">
                    {/* Dòng cảnh báo nhỏ theo yêu cầu */}
                    <div className="food-ai-disclaimer">
                      <span style={{ fontSize: '14px' }}>⚠️</span>
                      <span>Gợi ý AI có thể cần kiểm chứng lại địa chỉ thực tế trước khi khởi hành.</span>
                    </div>

                    {foodMapModal.loadingAi ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontSize: '13px', fontWeight: '600' }}>
                          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                          AI đang phân tích & gợi ý ẩm thực quanh chặng...
                        </div>
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="food-skeleton-card">
                            <div className="skeleton-shimmer" style={{ height: '18px', width: '70%' }} />
                            <div className="skeleton-shimmer" style={{ height: '14px', width: '50%' }} />
                            <div className="skeleton-shimmer" style={{ height: '36px', width: '100%' }} />
                          </div>
                        ))}
                      </div>
                    ) : foodMapModal.errorAi ? (
                      <div style={{ margin: '16px', padding: '20px', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>{foodMapModal.errorAi}</p>
                        <button 
                          type="button" 
                          className="btn-food-action" 
                          onClick={() => fetchAISuggestions(foodMapModal.currentKeyword, foodMapModal.query)}
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : foodMapModal.aiSuggestions.length === 0 ? (
                      <div style={{ margin: '16px', padding: '32px 16px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px', color: '#64748b', fontSize: '13px' }}>
                        <p style={{ fontSize: '26px', margin: '0 0 6px 0' }}>🔍</p>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#334155' }}>
                          Không tìm thấy gợi ý AI phù hợp cho '{foodMapModal.currentKeyword || mapQuery}'
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px' }}>
                          Vui lòng thử lại với từ khóa khác hoặc bấm xem gợi ý gốc.
                        </p>
                        <button 
                          type="button" 
                          className="btn-food-action" 
                          onClick={() => {
                            setMapSearchInput('');
                            handlePerformSearch('restaurants');
                          }}
                        >
                          ↺ Xem đặc sản nổi tiếng
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                        {foodMapModal.aiSuggestions.map((item, idx) => {
                          const itemKey = `${item.name}-ai`;
                          const isAdded = !!addedRestaurants[itemKey];
                          const isAdding = addingRestaurantKey === itemKey;

                          return (
                            <article 
                              key={idx} 
                              className={`food-card ${mapQuery === item.name ? 'preview-active' : ''}`}
                              onMouseEnter={() => handlePreviewMap(item.name)}
                              onClick={() => handlePreviewMap(item.name)}
                              title="Click hoặc di chuột để xem vị trí trên bản đồ bên phải"
                            >
                              <div className="food-card-top">
                                <h4 className="food-card-name">{item.name}</h4>
                                {item.estimatedDistance && (
                                  <span className="food-card-distance" title="Khoảng cách ước lượng">
                                    📍 {item.estimatedDistance}
                                  </span>
                                )}
                              </div>

                              {item.specialty && (
                                <p className="food-card-specialty">
                                  <span>🍲</span> Món đặc trưng: <strong>{item.specialty}</strong>
                                </p>
                              )}

                              {item.reason && (
                                <p className="food-card-reason">
                                  💡 {item.reason}
                                </p>
                              )}

                              <div className="food-card-actions">
                                <button
                                  type="button"
                                  className={`btn-food-add ${isAdded ? 'added' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddRestaurantToItinerary(item, 'ai');
                                  }}
                                  disabled={isAdding}
                                  title="Lưu nhà hàng này thành hoạt động mới trong chuyến đi"
                                >
                                  {isAdding ? '⏳ Đang thêm...' : isAdded ? '✅ Đã thêm' : '➕ Thêm vào lịch trình'}
                                </button>

                                <button
                                  type="button"
                                  className="btn-food-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFoodName(item.name);
                                  }}
                                  title="Sao chép tên quán ăn"
                                >
                                  {copiedFoodName === item.name ? (
                                    <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      ✅ Đã chép
                                    </span>
                                  ) : (
                                    <>📋 Copy</>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="btn-food-action focus-map"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFocusMapRestaurant(item.name);
                                  }}
                                  title="Ghim bản đồ bên cạnh"
                                >
                                  🗺️ Ghim bản đồ
                                </button>

                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.name + ' ' + foodMapModal.query)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-food-action"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Chỉ đường trên Google Maps"
                                >
                                  🧭 Chỉ đường
                                </a>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nửa bên phải: Google Maps Embed Panel & Bản đồ trực quan */}
              <div className="food-map-panel">
                <div className="food-map-panel-bar">
                  <span>
                    Bản đồ: <strong>{mapQuery === 'restaurants' ? 'Tất cả quán ăn' : mapQuery}</strong> quanh <em>{foodMapModal.query}</em>
                  </span>
                  {mapQuery !== 'restaurants' && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setMapSearchInput('');
                        handlePerformSearch('restaurants');
                      }}
                      className="food-map-reset-btn"
                    >
                      ↺ Về toàn khu vực
                    </button>
                  )}
                </div>

                <div className="food-map-iframe-wrapper">
                  <iframe
                    title="Bản đồ quán ăn gần đây"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery + ' near ' + foodMapModal.query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="food-map-iframe"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            <div className="food-map-modal-footer">
              <span>💡 Di chuột hoặc click thẻ để xem vị trí trên bản đồ. Bấm <strong>"➕ Thêm vào lịch trình"</strong> để đưa vào kế hoạch chuyến đi.</span>
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(mapQuery + ' near ' + foodMapModal.query)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Mở Google Maps lớn ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mời thành viên */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripId={selectedTripId}
        tripTitle={trip?.title}
        onMemberAdded={() => {
          if (selectedTripId) {
            fetchTripData(selectedTripId);
          }
        }}
      />

      {/* Modal Đề xuất & Áp dụng Template lịch trình mẫu */}
      <TemplateSuggestModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        currentTrip={trip}
        hasExistingItems={items.length > 0}
        onApplySuccess={handleApplyTemplateSuccess}
        onPreviewTemplate={(tpl) => setPreviewTemplateTrip(tpl)}
        onCloneTrip={(tpl) => setCloneTemplateTrip(tpl)}
      />

      {/* Modal Xem trước chi tiết template */}
      {previewTemplateTrip && (
        <TemplatePreviewModal
          isOpen={!!previewTemplateTrip}
          trip={previewTemplateTrip}
          onClose={() => setPreviewTemplateTrip(null)}
          onUseTemplate={(tpl) => {
            setPreviewTemplateTrip(null);
            handleApplyDirectTemplate(tpl);
          }}
        />
      )}

      {/* Modal Nhân bản trip mới từ template */}
      {cloneTemplateTrip && (
        <CloneTripModal
          isOpen={!!cloneTemplateTrip}
          trip={cloneTemplateTrip}
          onClose={() => setCloneTemplateTrip(null)}
          onCloneSuccess={(newId) => {
            setCloneTemplateTrip(null);
            setShowTemplateModal(false);
            navigate(`/itinerary/${newId}`, {
              state: { message: "Nhân bản thành công chuyến đi mới từ template!" }
            });
          }}
        />
      )}
    </div>
  );
};

export default ItineraryPage;
