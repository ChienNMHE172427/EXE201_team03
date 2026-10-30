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
import TripNavigation from '../components/TripNavigation';
import GoongMapView from '../components/GoongMapView';
import { UserPlus, Sparkles, Flame, Layers, Eye, CloudRain, Plus, Building, Bus, Utensils, Check, Search, MapPin, Coffee, Beer, ShoppingCart, Map, Compass, Leaf, Clock, CheckCircle, AlertCircle, RefreshCw, Umbrella, Lightbulb, Share2, Globe, Lock, Loader2, ExternalLink } from 'lucide-react';
import servicesData from '../servicesData.json';
import hotelLinks from '../hotelLinks.json';
import getVexereLink from '../utils/getVexereLink';
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
  const [isSharingTrip, setIsSharingTrip] = useState(false);

  const handleToggleShareTrip = async () => {
    if (!trip) return;
    setIsSharingTrip(true);
    try {
      const res = await api.put(`/trips/${trip.id}/toggle-public`);
      const newIsPublic = res.data?.isPublic ?? !trip.isPublic;
      setTrip({ ...trip, isPublic: newIsPublic });
      setCloneToast(res.data?.message || (newIsPublic ? 'Đã chia sẻ lịch trình thành công! Mọi người có thể xem và nhân bản làm mẫu.' : 'Đã hủy chia sẻ lịch trình.'));
      // Cập nhật lại danh sách publicTemplates
      const pubRes = await api.get('/trips/public');
      setPublicTemplates((pubRes.data || []).filter(t => t.isPublic === true));
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể thay đổi trạng thái chia sẻ.');
    } finally {
      setIsSharingTrip(false);
    }
  };

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
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
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

  // State Dịch vụ Đối tác Affiliate (Cư trú & Nhà xe)
  const [affiliateServices, setAffiliateServices] = useState([]);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);

  // State tìm kiếm địa điểm thực tế (Nominatim OpenStreetMap) & Tabs
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingRealPoi, setIsSearchingRealPoi] = useState(false);
  const [searchPoiError, setSearchPoiError] = useState(null);
  const [activeFoodTab, setActiveFoodTab] = useState('real'); // 'real' | 'ai'
  const [addingRestaurantKey, setAddingRestaurantKey] = useState(null);
  const [addedRestaurants, setAddedRestaurants] = useState({});
  const [foodModalToast, setFoodModalToast] = useState(null);
  const [serviceNoticeModal, setServiceNoticeModal] = useState({
    isOpen: false,
    type: '', // 'restaurant_added' | 'require_booking'
    serviceName: '',
    serviceCategory: '',
    stageTitle: '',
    actionUrl: '',
    updatedItem: null
  });

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
    setAffiliateServices([]);
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
      fetchRealPoiSuggestions(query, foodMapModal.query, foodMapModal.category);
    }, 450);

    return () => clearTimeout(timer);
  }, [mapSearchInput, foodMapModal.isOpen, foodMapModal.query, foodMapModal.category]);

  // Helper lấy tọa độ từ Goong Geocode hoặc bộ tọa độ chuẩn Việt Nam
  const getApproxCoords = async (locName, goongApiKey) => {
    const DEFAULT_COORDS = {
      'quảng ninh': { lat: 20.9500, lng: 107.0500 },
      'hạ long': { lat: 20.9500, lng: 107.0500 },
      'bãi cháy': { lat: 20.9580, lng: 107.0345 },
      'ninh bình': { lat: 20.2506, lng: 105.9745 },
      'tam cốc': { lat: 20.2185, lng: 105.9224 },
      'tràng an': { lat: 20.2541, lng: 105.9189 },
      'lào cai': { lat: 22.4856, lng: 103.9715 },
      'sa pa': { lat: 22.3364, lng: 103.8438 },
      'sapa': { lat: 22.3364, lng: 103.8438 },
      'hà giang': { lat: 22.8233, lng: 104.9836 },
      'cao bằng': { lat: 22.6663, lng: 106.2575 },
      'hà nội': { lat: 21.0285, lng: 105.8391 },
      'đà nẵng': { lat: 16.0544, lng: 108.2022 },
      'hội an': { lat: 15.8801, lng: 108.3380 },
      'đà lạt': { lat: 11.9404, lng: 108.4583 }
    };

    if (locName) {
      const lower = locName.toLowerCase();
      for (const [key, val] of Object.entries(DEFAULT_COORDS)) {
        if (lower.includes(key)) return val;
      }
      if (goongApiKey) {
        try {
          const res = await fetch(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(locName)}&api_key=${goongApiKey}`);
          const data = await res.json();
          const loc = data?.results?.[0]?.geometry?.location;
          if (loc && loc.lat && loc.lng) return loc;
        } catch (e) {
          // ignore
        }
      }
    }
    return { lat: 21.0285, lng: 105.8391 }; // Mặc định Hà Nội
  };

  // Hàm gọi API lấy danh sách địa điểm thực tế (Tích hợp Goong Maps API cho phần Ăn uống)
  const fetchRealPoiSuggestions = async (kw, baseLocation, category = foodMapModal.category) => {
    setIsSearchingRealPoi(true);
    setSearchPoiError(null);
    const goongApiKey = import.meta.env.VITE_GOONG_API_KEY || '8t6CSznO6o66F5sPh3xw9uAvULdB0rKGGmEISOl2';

    // 1. Chỉ áp dụng Goong Maps cho chuyên mục Ăn uống (food)
    if (category === 'food' && goongApiKey) {
      try {
        const center = await getApproxCoords(baseLocation, goongApiKey);
        const searchInput = (kw && kw !== 'restaurants' ? kw : 'quán ăn').trim();
        const autoUrl = `https://rsapi.goong.io/Place/AutoComplete?api_key=${goongApiKey}&input=${encodeURIComponent(searchInput)}&location=${center.lat},${center.lng}&limit=8`;
        
        const autoRes = await fetch(autoUrl);
        const autoData = await autoRes.json();

        if (autoData && Array.isArray(autoData.predictions) && autoData.predictions.length > 0) {
          // Lấy chi tiết tọa độ cho danh sách quán ăn
          const detailPromises = autoData.predictions.slice(0, 6).map(async (pred) => {
            try {
              const dRes = await fetch(`https://rsapi.goong.io/Place/Detail?place_id=${pred.place_id}&api_key=${goongApiKey}`);
              const dData = await dRes.json();
              const loc = dData?.result?.geometry?.location;
              return {
                place_id: pred.place_id,
                name: pred.structured_formatting?.main_text || pred.description.split(',')[0].trim(),
                display_name: pred.description,
                lat: loc?.lat || center.lat,
                lon: loc?.lng || center.lng,
                lng: loc?.lng || center.lng,
                type: pred.types?.[0] || 'restaurant'
              };
            } catch {
              return {
                place_id: pred.place_id,
                name: pred.structured_formatting?.main_text || pred.description.split(',')[0].trim(),
                display_name: pred.description,
                lat: center.lat,
                lon: center.lng,
                lng: center.lng,
                type: 'restaurant'
              };
            }
          });

          const results = await Promise.all(detailPromises);
          setSearchResults(results);
          setIsSearchingRealPoi(false);
          return;
        }
      } catch (err) {
        console.warn('Lỗi gọi Goong API, chuyển sang OSM:', err);
      }
    }

    // 2. Fallback Nominatim OpenStreetMap (hoặc khi tìm khách sạn/bến xe)
    try {
      const fullQuery = `${kw} ${baseLocation || ''}`.trim();
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=vn&q=${encodeURIComponent(fullQuery)}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi,en'
        }
      });
      if (!res.ok) throw new Error('Không thể kết nối Nominatim OSM');
      let data = await res.json();
      
      // Fallback search: if no results found, search just the baseLocation (so map centers correctly)
      if ((!data || data.length === 0) && kw && baseLocation && kw !== baseLocation) {
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=vn&q=${encodeURIComponent(baseLocation)}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            'Accept-Language': 'vi,en'
          }
        });
        if (fallbackRes.ok) {
           const fallbackData = await fallbackRes.json();
           if (fallbackData && fallbackData.length > 0) {
             data = fallbackData;
           }
        }
      }

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

  // Trích xuất địa danh ngắn gọn của chặng / chuyến đi để tự động điền vào ô tìm kiếm dịch vụ
  const extractLocationKeyword = (item, tripData) => {
    // Danh sách các điểm đến du lịch cụ thể (ưu tiên từ địa danh chi tiết đến tỉnh/thành)
    const knownDestinations = [
      'cô tô', 'quan lạn', 'minh châu', 'bình liêu', 'yên tử', 'bãi cháy', 'hạ long', 'tuần châu', 'vân đồn',
      'cát bà', 'lan hạ',
      'fansipan', 'ô quy hồ', 'cát cát', 'mường hoa', 'bắc hà', 'sa pa', 'sapa',
      'tràng an', 'tam cốc', 'bích động', 'bái đính', 'hoa lư', 'hang múa', 'vân long',
      'lũng cú', 'mã pí lèng', 'nho quế', 'đồng văn', 'hoàng su phì', 'quản bạ', 'mèo vạc',
      'bản giốc', 'ngườm ngao', 'pác bó', 'thăng hen', 'mắt thần', 'núi thủng', 'trùng khánh',
      'quảng ninh', 'ninh bình', 'lào cai', 'hải phòng', 'hà giang', 'cao bằng',
      'đà nẵng', 'hội an', 'đà lạt', 'phú quốc', 'nha trang', 'huế', 'quy nhơn', 'hà nội'
    ];

    const formatMatchedLoc = (loc) => {
      if (loc === 'sapa') return 'Sa Pa';
      return loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Helper làm sạch tên điểm đến (ví dụ "Đảo Cô Tô, Quảng Ninh" -> "Cô Tô")
    const cleanDestinationName = (str) => {
      if (!str) return '';
      let s = str.trim();
      const firstPart = s.split(',')[0].trim();
      return firstPart
        .replace(/^(khám phá|tham quan|check-in|checkin|du lịch|đến|tới|ở|nghỉ ngơi tại|khách sạn|homestay tại|resort tại|đảo|vịnh|danh thắng|quần thể|khu di tích|cố đô|đỉnh|đèo|bản|thung lũng|phố cổ|thác|động|hồ|cột cờ)\s+/i, '')
        .trim() || firstPart;
    };

    const originShort = getShortLocation(tripData?.origin || '').toLowerCase().trim();

    // 1. Ưu tiên kiểm tra điểm đến chính của chuyến đi (tripData.destination) và phần điểm đến trong tiêu đề chặng
    if (item?.title && item.title.trim()) {
      let titleToScan = item.title;
      if (/\s+(?:đi|đến)\s+/i.test(titleToScan)) {
        const parts = titleToScan.split(/\s+(?:đi|đến)\s+/i);
        titleToScan = parts[parts.length - 1];
      }
      const titleLower = titleToScan.toLowerCase();
      for (const loc of knownDestinations) {
        if (loc === originShort && tripData?.destination && !tripData.destination.toLowerCase().includes(loc)) {
          continue;
        }
        if (titleLower.includes(loc)) {
          return formatMatchedLoc(loc);
        }
      }
    }

    // 2. Kiểm tra từ điểm đến chính của toàn bộ chuyến đi (tripData.destination) - ví dụ: "Đảo Cô Tô" -> "Cô Tô"
    if (tripData?.destination && tripData.destination.trim()) {
      const tripDestLower = tripData.destination.toLowerCase();
      for (const loc of knownDestinations) {
        if (tripDestLower.includes(loc)) {
          return formatMatchedLoc(loc);
        }
      }
      const cleanedTripDest = cleanDestinationName(tripData.destination);
      if (cleanedTripDest) return cleanedTripDest;
    }

    // 3. Kiểm tra destination của chặng (nếu không phải mặc định)
    if (item?.destination && item.destination.trim() && item.destination !== 'Vui lòng chọn dịch vụ') {
      const itemDestLower = item.destination.toLowerCase();
      for (const loc of knownDestinations) {
        if (itemDestLower.includes(loc)) {
          return formatMatchedLoc(loc);
        }
      }
      const dest = cleanDestinationName(item.destination);
      if (dest) return dest;
    }

    // 4. Chỉ lấy item.location nếu nó khác điểm xuất phát (origin) của chuyến đi
    if (item?.location && item.location.trim()) {
      const itemLocShort = getShortLocation(item.location).toLowerCase().trim();
      if (!originShort || itemLocShort !== originShort) {
        const loc = cleanDestinationName(item.location);
        if (loc) return loc;
      }
    }

    return '';
  };

  // Hàm tải danh sách dịch vụ (Cư trú, Nhà xe & Quán ăn thực tế)
  const fetchAffiliateServices = async (cat) => {
    setLoadingAffiliate(true);
    try {
      // 1. DỊCH VỤ NHÀ XE (TRANSPORT) - Tích hợp Vexere đầy đủ tất cả các tuyến & điểm đến
      if (cat === 'transport') {
        const transList = [
          // Quảng Ninh (Hạ Long, Bãi Cháy, Cô Tô, Quan Lạn, Yên Tử, Bình Liêu)
          {
            id: 'vexere-qn-coto',
            name: 'Tàu cao tốc & Xe Limousine đi Đảo Cô Tô - Quan Lạn',
            category: 'transport',
            destination: 'Đảo Cô Tô, Quan Lạn, Cảng Ao Tiên, Vân Đồn',
            region: 'Quảng Ninh',
            notes: 'Kết nối xe Limousine VIP Hà Nội ↔ Cảng Ao Tiên và tàu cao tốc đi Đảo Cô Tô, Đảo Quan Lạn qua Vexere.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/BmJJ5wE9'
          },
          {
            id: 'vexere-qn-hl',
            name: 'Xe Limousine Phúc Xuyên VIP (Hà Nội - Hạ Long - Bãi Cháy)',
            category: 'transport',
            destination: 'Vịnh Hạ Long, Bãi Cháy, Tuần Châu',
            region: 'Quảng Ninh',
            notes: 'Dàn xe Limousine VIP cao cấp qua Vexere, đón trả tận nơi tại Bãi Cháy, Hòn Gai, Tuần Châu, Hạ Long.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/BmJJ5wE9'
          },
          {
            id: 'vexere-qn-vdx',
            name: 'Xe Vân Đồn Xanh Limousine (Hà Nội - Hạ Long - Vân Đồn - Cô Tô)',
            category: 'transport',
            destination: 'Vịnh Hạ Long, Cô Tô, Vân Đồn, Cẩm Phả',
            region: 'Quảng Ninh',
            notes: 'Chạy cao tốc Hà Nội - Hạ Long - Cảng Ao Tiên (Cô Tô) êm ái, ghế massage, wifi tốc độ cao.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/BmJJ5wE9'
          },
          {
            id: 'vexere-qn-yt',
            name: 'Nhà xe Đức Phúc & Limousine đi Yên Tử - Bình Liêu',
            category: 'transport',
            destination: 'Danh thắng Yên Tử, Uông Bí, Bình Liêu',
            region: 'Quảng Ninh',
            notes: 'Tuyến xe khách & Limousine chất lượng cao đi Yên Tử, Uông Bí, Bình Liêu qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/BmJJ5wE9'
          },
          // Lào Cai / Sa Pa
          {
            id: 'vexere-lc-sv',
            name: 'Xe Cabin Cung Điện Sao Việt (Hà Nội - Sa Pa - Fansipan)',
            category: 'transport',
            destination: 'Sa Pa, Đỉnh Fansipan, Cát Cát, Mường Hoa, Ô Quy Hồ',
            region: 'Lào Cai',
            notes: 'Tuyến xe cabin VIP đôi và đơn cao cấp qua Vexere, đón trả tận nơi tại trung tâm thị xã Sa Pa.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/QGuJ9Fue'
          },
          {
            id: 'vexere-lc-fe',
            name: 'Xe Khách Fansipan Express & Inter Bus Lines (Hà Nội - Sa Pa)',
            category: 'transport',
            destination: 'Sa Pa, Bản Cát Cát, Thung lũng Mường Hoa, Đèo Ô Quy Hồ',
            region: 'Lào Cai',
            notes: 'Xe giường nằm & cabin cao cấp phục vụ khách du lịch đi Sa Pa qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/QGuJ9Fue'
          },
          {
            id: 'vexere-lc-bh',
            name: 'Xe Khách Hà Sơn Hải Vân (Hà Nội - Lào Cai - Bắc Hà)',
            category: 'transport',
            destination: 'Bắc Hà, Dinh Hoàng A Tưởng, Sa Pa',
            region: 'Lào Cai',
            notes: 'Nhà xe uy tín hàng đầu tuyến Tây Bắc đi Lào Cai, Bắc Hà, Sa Pa qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/QGuJ9Fue'
          },
          // Ninh Bình
          {
            id: 'vexere-nb-ta',
            name: 'Xe Limousine Tràng An VIP (Hà Nội - Ninh Bình)',
            category: 'transport',
            destination: 'Quần thể Tràng An, Tam Cốc, Bích Động, Bái Đính, Hang Múa, Hoa Lư',
            region: 'Ninh Bình',
            notes: 'Xe Limousine 9-11 chỗ ghế massage cao cấp qua Vexere, đón trả tận nơi tại Tam Cốc, Tràng An, Hang Múa.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/R3cnEDct'
          },
          {
            id: 'vexere-nb-dk',
            name: 'Nhà xe Duy Khang & Ninh Bình Excursion Limousine',
            category: 'transport',
            destination: 'Tam Cốc - Bích Động, Cố đô Hoa Lư, Chùa Bái Đính, Hang Múa',
            region: 'Ninh Bình',
            notes: 'Tần suất 60 phút/chuyến, chuyên tuyến Hà Nội ↔ Ninh Bình trả tận điểm lưu trú qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/R3cnEDct'
          },
          // Hà Giang
          {
            id: 'vexere-hg-bp',
            name: 'Xe Cung Điện Bằng Phấn (Hà Nội - Hà Giang - Đồng Văn)',
            category: 'transport',
            destination: 'Cột cờ Lũng Cú, Phố cổ Đồng Văn, Mã Pí Lèng, Sông Nho Quế',
            region: 'Hà Giang',
            notes: 'Xe cabin cung điện đôi & đơn tiện nghi sang trọng nhất tuyến Hà Nội ↔ Hà Giang qua Vexere.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/STy4Pakb'
          },
          {
            id: 'vexere-hg-qn',
            name: 'Xe Limousine Quang Nghị & Đăng Quang (Hà Nội - Đồng Văn - Hoàng Su Phì)',
            category: 'transport',
            destination: 'Phố cổ Đồng Văn, Mã Pí Lèng, Dinh Vua Mèo, Hoàng Su Phì',
            region: 'Hà Giang',
            notes: 'Xe VIP chuyên tuyến thẳng lên cao nguyên đá Đồng Văn, Mèo Vạc và Hoàng Su Phì qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/STy4Pakb'
          },
          // Cao Bằng
          {
            id: 'vexere-cb-tl',
            name: 'Xe Limousine Thanh Ly & Hiệp Mừng (Hà Nội - Cao Bằng - Bản Giốc)',
            category: 'transport',
            destination: 'Thác Bản Giốc, Động Ngườm Ngao, Trùng Khánh, Hồ Thăng Hen, Mắt Thần',
            region: 'Cao Bằng',
            notes: 'Xe Limousine & giường nằm cao cấp đón trả tận nơi tại TP Cao Bằng, Thác Bản Giốc qua Vexere.',
            rating: 4.9,
            affiliateUrl: 'https://shorten.asia/Nck74KXF'
          },
          {
            id: 'vexere-cb-kh',
            name: 'Xe Giường Nằm Khánh Hoàn (Hà Nội - Cao Bằng - Pác Bó)',
            category: 'transport',
            destination: 'Khu di tích Pác Bó, Suối Lê-nin, Thác Bản Giốc, Núi Thủng',
            region: 'Cao Bằng',
            notes: 'Xe giường nằm hiện đại xuất bến hàng ngày đi Cao Bằng, Pác Bó qua Vexere.',
            rating: 4.8,
            affiliateUrl: 'https://shorten.asia/Nck74KXF'
          }
        ];

        // Bổ sung các nhà xe chi tiết theo từng địa danh từ servicesData.json
        if (Array.isArray(servicesData)) {
          const existingTransNames = new Set(transList.map(t => t.name.toLowerCase()));
          servicesData
            .filter(x => x.category === 'Di chuyển' || x.type === 'DI CHUYỂN')
            .forEach((r, idx) => {
              if (existingTransNames.has((r.title || '').toLowerCase())) return;
              const desc = r.desc || '';
              let region = 'Quảng Ninh';
              if (desc.includes('Fansipan') || desc.includes('Cát Cát') || desc.includes('Ô Quy Hồ') || desc.includes('Mường Hoa') || desc.includes('Bắc Hà') || desc.includes('Sa Pa')) {
                region = 'Lào Cai';
              } else if (desc.includes('Tràng An') || desc.includes('Tam Cốc') || desc.includes('Bái Đính') || desc.includes('Hoa Lư') || desc.includes('Hang Múa')) {
                region = 'Ninh Bình';
              } else if (desc.includes('Lũng Cú') || desc.includes('Mã Pí Lèng') || desc.includes('Đồng Văn') || desc.includes('Hoàng Su Phì') || desc.includes('Vương')) {
                region = 'Hà Giang';
              } else if (desc.includes('Bản Giốc') || desc.includes('Ngườm Ngao') || desc.includes('Pác Bó') || desc.includes('Thăng Hen') || desc.includes('Mắt thần')) {
                region = 'Cao Bằng';
              }
              const cleanDest = desc.replace('Dịch vụ xe tại ', '').trim() || region;
              transList.push({
                id: `svc-trans-${idx}`,
                name: r.title,
                category: 'transport',
                destination: cleanDest,
                region: region,
                notes: `${desc} - Đặt vé xe trực tuyến qua đối tác Vexere.`,
                rating: r.rating || 4.7,
                affiliateUrl: getVexereLink({ title: r.title, desc: r.desc, destination: cleanDest, region }, cleanDest)
              });
            });
        }

        setAffiliateServices(transList);
        return;
      }

      // 2. DỊCH VỤ CƯ TRÚ (HOTEL)
      if (cat === 'hotel') {
        let backendHotels = [];
        try {
          const res = await api.get('/AffiliateService/all-active', {
            params: { category: cat },
            validateStatus: (status) => status < 500
          });
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            backendHotels = res.data;
          }
        } catch (apiErr) {
          console.warn('API /all-active hotel không phản hồi, nạp danh mục khách sạn chuẩn:', apiErr);
        }

        // KHO DỮ LIỆU KHÁCH SẠN ĐẦY ĐỦ CÁC VÙNG DU LỊCH TRỌNG ĐIỂM (100% link shorten.asia chuẩn)
        const fullHotelList = [
          // Quảng Ninh: Đảo Cô Tô, Vịnh Hạ Long, Yên Tử, Quan Lạn - Minh Châu
          { id: 'qn-hotel-7', name: "Coto Eco Lodge", category: 'hotel', destination: "Đảo Cô Tô", region: "Quảng Ninh", notes: "Khu nhà gỗ sinh thái độc đáo bên bãi biển Hồng Vàn, Cô Tô, không gian yên tĩnh.", rating: 4.8, affiliateUrl: "https://shorten.asia/aJNpXRf4" },
          { id: 'qn-hotel-8', name: "Coto Center Homestay", category: 'hotel', destination: "Đảo Cô Tô", region: "Quảng Ninh", notes: "Homestay ngay trung tâm thị trấn Cô Tô, gần chợ hải sản và bãi biển.", rating: 4.8, affiliateUrl: "https://shorten.asia/TADrDdnM" },
          { id: 'qn-hotel-1', name: "Halios Hotel Halong", category: 'hotel', destination: "Vịnh Hạ Long & Bãi Cháy", region: "Quảng Ninh", notes: "Khách sạn trung tâm Bãi Cháy, gần bãi tắm và công viên Sun World.", rating: 4.8, affiliateUrl: "https://shorten.asia/JcA53PgX" },
          { id: 'qn-hotel-2', name: "Halong Lavender Hotel", category: 'hotel', destination: "Vịnh Hạ Long & Bãi Cháy", region: "Quảng Ninh", notes: "Không gian nghỉ dưỡng hiện đại, view nhìn ra Vịnh Hạ Long thoáng mát.", rating: 4.7, affiliateUrl: "https://shorten.asia/S3JcJAZ6" },
          { id: 'qn-hotel-3', name: "Halong Boutique Hotel", category: 'hotel', destination: "Vịnh Hạ Long & Bãi Cháy", region: "Quảng Ninh", notes: "Khách sạn phong cách Boutique sang trọng, dịch vụ chuyên nghiệp.", rating: 4.8, affiliateUrl: "https://shorten.asia/z6CQVMef" },
          { id: 'qn-hotel-4', name: "Bảo Ngọc Hotel 2", category: 'hotel', destination: "Vịnh Hạ Long & Bãi Cháy", region: "Quảng Ninh", notes: "Khách sạn tiện nghi, giá hợp lý, thuận tiện di chuyển ra bến tàu.", rating: 4.6, affiliateUrl: "https://shorten.asia/KqEEGVvj" },
          { id: 'qn-hotel-5', name: "Legacy Yen Tu Hotel - MGallery Collection", category: 'hotel', destination: "Danh thắng Yên Tử", region: "Quảng Ninh", notes: "Khu nghỉ dưỡng 5 sao đẳng cấp quốc tế dưới chân núi Yên Tử, kiến trúc cung đình thời Trần.", rating: 4.9, affiliateUrl: "https://shorten.asia/429ha1PE" },
          { id: 'qn-hotel-6', name: "Yen Tu Village", category: 'hotel', destination: "Danh thắng Yên Tử", region: "Quảng Ninh", notes: "Làng hành hương Yên Tử mang phong cách truyền thống yên bình, mộc mạc.", rating: 4.7, affiliateUrl: "https://shorten.asia/ezkBASAC" },
          { id: 'qn-hotel-9', name: "Angsana Quan Lan Ha Long Bay", category: 'hotel', destination: "Đảo Quan Lạn - Minh Châu", region: "Quảng Ninh", notes: "Resort cao cấp bên bờ biển Quan Lạn hoang sơ, hồ bơi và tiện ích 5 sao.", rating: 4.9, affiliateUrl: "https://shorten.asia/h6kTTSe3" },
          { id: 'qn-hotel-10', name: "Khách sạn Paloma", category: 'hotel', destination: "Đảo Quan Lạn - Minh Châu", region: "Quảng Ninh", notes: "Khách sạn sạch sẽ, đầy đủ tiện nghi gần bãi tắm Minh Châu cát trắng mịn.", rating: 4.6, affiliateUrl: "https://shorten.asia/DuUjQJBt" },
          { id: 'qn-hotel-11', name: "Minh Châu Riverside", category: 'hotel', destination: "Đảo Quan Lạn - Minh Châu", region: "Quảng Ninh", notes: "Không gian thoáng mát ven sông, thuận tiện tắm biển và ăn hải sản tại Quan Lạn.", rating: 4.7, affiliateUrl: "https://shorten.asia/86955uGQ" },

          // Sa Pa / Lào Cai
          { id: 'sp-hotel-1', name: "KK Sapa Hotel", category: 'hotel', destination: "Trung tâm Thị trấn Sa Pa & Mường Hoa", region: "Sa Pa / Lào Cai", notes: "Khách sạn 5 sao sang trọng nhìn thẳng ra Thung Lũng Mường Hoa và Fansipan.", rating: 4.9, affiliateUrl: "https://shorten.asia/4mUeh5BN" },
          { id: 'sp-hotel-2', name: "Pao's Sapa Leisure Hotel", category: 'hotel', destination: "Trung tâm Thị trấn Sa Pa & Mường Hoa", region: "Sa Pa / Lào Cai", notes: "Khách sạn 5 sao đẳng cấp ôm trọn triền đồi, hồ bơi nước nóng trong nhà.", rating: 4.9, affiliateUrl: "https://shorten.asia/6pfAt6qB" },
          { id: 'sp-hotel-3', name: "DeLaSol Sapa Hotel", category: 'hotel', destination: "Trung tâm Thị trấn Sa Pa & Bản Cát Cát", region: "Sa Pa / Lào Cai", notes: "Khách sạn tiện nghi trung tâm Sa Pa, view thung lũng mây bồng bềnh.", rating: 4.8, affiliateUrl: "https://shorten.asia/qruA6GRK" },
          { id: 'sp-hotel-4', name: "Ville De Mont Mountain Resort", category: 'hotel', destination: "Thung lũng Mường Hoa & Sa Pa", region: "Sa Pa / Lào Cai", notes: "Resort biệt thự biệt lập giữa rừng thông ở độ cao 1.550m ngắm trọn biển mây.", rating: 4.9, affiliateUrl: "https://shorten.asia/myJrNyWG" },
          { id: 'sp-hotel-5', name: "Nomadtrails Boutique Hotel", category: 'hotel', destination: "Trung tâm Thị trấn Sa Pa & Bản Cát Cát", region: "Sa Pa / Lào Cai", notes: "Phong cách Boutique độc đáo, vị trí trung tâm thuận tiện dạo phố đêm Sa Pa.", rating: 4.7, affiliateUrl: "https://shorten.asia/gBMqS1D4" },
          { id: 'sp-hotel-6', name: "Sapa House Hotel Halal Certified", category: 'hotel', destination: "Trung tâm Thị trấn Sa Pa", region: "Sa Pa / Lào Cai", notes: "Khách sạn ấm cúng ngay gần Nhà Thờ Đá Sa Pa, dịch vụ thân thiện.", rating: 4.7, affiliateUrl: "https://shorten.asia/f4A5neZa" },
          { id: 'sp-hotel-7', name: "Heaven Gate Hotel O Quy Ho", category: 'hotel', destination: "Đèo Ô Quy Hồ & Đỉnh Fansipan", region: "Sa Pa / Lào Cai", notes: "Khách sạn ngay Cổng Trời Ô Quy Hồ, điểm săn mây và hoàng hôn ngoạn mục nhất Sa Pa.", rating: 4.8, affiliateUrl: "https://shorten.asia/kC4X5VmV" },
          { id: 'sp-hotel-8', name: "Fansipan View Hotel", category: 'hotel', destination: "Đỉnh Fansipan & Sa Pa", region: "Sa Pa / Lào Cai", notes: "Tầm nhìn bao quát đỉnh Fansipan hùng vĩ, gần ga cáp treo Sun World.", rating: 4.7, affiliateUrl: "https://shorten.asia/YHdteHQb" },
          { id: 'sp-hotel-9', name: "Bình Bản Liền Homestay", category: 'hotel', destination: "Bắc Hà & Dinh Hoàng A Tưởng", region: "Sa Pa / Lào Cai", notes: "Trải nghiệm nhà sàn truyền thống giữa những đồi chè shan tuyết cổ thụ Bản Liền, Bắc Hà.", rating: 4.8, affiliateUrl: "https://shorten.asia/mN1edBR2" },
          { id: 'sp-hotel-10', name: "Sa House Bắc Hà", category: 'hotel', destination: "Bắc Hà & Dinh Hoàng A Tưởng", region: "Sa Pa / Lào Cai", notes: "Homestay xinh xắn tại cao nguyên trắng Bắc Hà, gần Dinh Hoàng A Tưởng.", rating: 4.7, affiliateUrl: "https://shorten.asia/v91VFBmc" },
          { id: 'sp-hotel-11', name: "Ngan Nga Legend", category: 'hotel', destination: "Bắc Hà & Dinh Hoàng A Tưởng", region: "Sa Pa / Lào Cai", notes: "Khách sạn trung tâm thị trấn Bắc Hà, thuận tiện tham quan chợ phiên cuối tuần.", rating: 4.6, affiliateUrl: "https://shorten.asia/NhPsy688" },

          // Ninh Bình
          { id: 'nb-hotel-1', name: "Ninh Binh Hidden Charm Hotel & Resort", category: 'hotel', destination: "Tam Cốc - Bích Động & Hang Múa", region: "Ninh Bình", notes: "Khách sạn nghỉ dưỡng 4 sao phong cách trang nhã bên bến thuyền Tam Cốc, hồ bơi ngoài trời.", rating: 4.8, affiliateUrl: "https://shorten.asia/JcA53PgX" },
          { id: 'nb-hotel-2', name: "Tam Coc Rice Fields Resort", category: 'hotel', destination: "Tam Cốc - Bích Động & Hang Múa", region: "Ninh Bình", notes: "Resort view cánh đồng lúa bát ngát và rặng núi đá vôi nguyên sơ tuyệt đẹp.", rating: 4.7, affiliateUrl: "https://shorten.asia/S3JcJAZ6" },
          { id: 'nb-hotel-3', name: "Trang An Retreat", category: 'hotel', destination: "Quần thể Tràng An & Cố đô Hoa Lư", region: "Ninh Bình", notes: "Khu bungalow mộc mạc ẩn mình giữa thung lũng Tràng An thanh bình, có hồ bơi nhìn ra núi.", rating: 4.8, affiliateUrl: "https://shorten.asia/z6CQVMef" },
          { id: 'nb-hotel-4', name: "Emeralda Resort Ninh Binh", category: 'hotel', destination: "Chùa Bái Đính & Đầm Vân Long", region: "Ninh Bình", notes: "Resort 5 sao mang đậm kiến trúc cung đình và làng quê Bắc Bộ cổ kính.", rating: 4.9, affiliateUrl: "https://shorten.asia/429ha1PE" },
          { id: 'nb-hotel-5', name: "The Reed Hotel Ninh Binh", category: 'hotel', destination: "TP. Ninh Bình, Tràng An & Hoa Lư", region: "Ninh Bình", notes: "Khách sạn 4 sao trung tâm thành phố Ninh Bình, dịch vụ cao cấp và ẩm thực phong phú.", rating: 4.7, affiliateUrl: "https://shorten.asia/JcA53PgX" },
          { id: 'nb-hotel-6', name: "Ninh Binh Legend Hotel", category: 'hotel', destination: "TP. Ninh Bình, Tràng An & Bái Đính", region: "Ninh Bình", notes: "Khách sạn 5 sao tiêu chuẩn quốc tế với hồ bơi vô cực và view non nước hữu tình.", rating: 4.8, affiliateUrl: "https://shorten.asia/JcA53PgX" },

          // Hải Phòng / Cát Bà
          { id: 'hp-hotel-1', name: "Khách sạn Giấc Mơ Cát Bà", category: 'hotel', destination: "Đảo Cát Bà & Vịnh Lan Hạ", region: "Hải Phòng", notes: "Khách sạn view vịnh Lan Hạ, thuận tiện đón tàu tham quan vịnh và đảo khỉ.", rating: 4.7, affiliateUrl: "https://shorten.asia/bVfmwTFr" },
          { id: 'hp-hotel-2', name: "CatBa BackPackers Hostel & Pool Bar", category: 'hotel', destination: "Đảo Cát Bà & Vịnh Lan Hạ", region: "Hải Phòng", notes: "Hostel phong cách trẻ trung năng động có hồ bơi ngoài trời và quầy bar.", rating: 4.8, affiliateUrl: "https://shorten.asia/s8QFsSzn" },
          { id: 'hp-hotel-3', name: "Cat Ba Wonder Hotel", category: 'hotel', destination: "Đảo Cát Bà & Vịnh Lan Hạ", region: "Hải Phòng", notes: "Khách sạn hiện đại ngay mặt đường chính thị trấn Cát Bà, gần bãi tắm Cát Cò.", rating: 4.7, affiliateUrl: "https://shorten.asia/pGCwVAfK" },

          // Hà Giang & Cao Bằng
          { id: 'hg-hotel-1', name: "Đồng Văn Eco Stone House", category: 'hotel', destination: "Phố cổ Đồng Văn, Lũng Cú & Mã Pí Lèng", region: "Hà Giang", notes: "Nhà đá truyền thống của người H'Mông độc đáo giữa lòng phố cổ Đồng Văn.", rating: 4.8, affiliateUrl: "https://shorten.asia/STy4Pakb" },
          { id: 'hg-hotel-2', name: "H'mong Village Resort", category: 'hotel', destination: "Quản Bạ, Hoàng Su Phì & Dinh Vua Mèo", region: "Hà Giang", notes: "Khu nghỉ dưỡng bungalow quẩy tấu độc đáo giữa núi rừng Hà Giang hùng vĩ.", rating: 4.9, affiliateUrl: "https://shorten.asia/STy4Pakb" },
          { id: 'cb-hotel-1', name: "Bản Giốc Resort", category: 'hotel', destination: "Thác Bản Giốc, Động Ngườm Ngao & Trùng Khánh", region: "Cao Bằng", notes: "Resort nghỉ dưỡng view nhìn trực diện dòng thác Bản Giốc hùng vĩ.", rating: 4.8, affiliateUrl: "https://shorten.asia/Nck74KXF" },
          { id: 'cb-hotel-2', name: "Max Boutique Hotel Cao Bằng", category: 'hotel', destination: "TP. Cao Bằng, Pác Bó, Hồ Thăng Hen & Núi Mắt Thần", region: "Cao Bằng", notes: "Khách sạn tiện nghi sang trọng ngay trung tâm thành phố Cao Bằng.", rating: 4.8, affiliateUrl: "https://shorten.asia/Nck74KXF" }
        ];

        // Map tra cứu URL chuẩn theo tên khách sạn để đảm bảo 100% có link affiliate shorten.asia
        const fallbackUrlByName = {};
        fullHotelList.forEach(h => {
          fallbackUrlByName[h.name.toLowerCase().trim()] = h.affiliateUrl;
        });

        const normalizedBackend = backendHotels.map(h => {
          const nameKey = (h.name || '').toLowerCase().trim();
          const validUrl = (h.affiliateUrl && h.affiliateUrl.includes('shorten.asia'))
            ? h.affiliateUrl
            : (hotelLinks[h.name] || fallbackUrlByName[nameKey] || h.affiliateUrl || 'https://shorten.asia/JcA53PgX');
          return { ...h, affiliateUrl: validUrl };
        });

        // Gộp dữ liệu an toàn từ backend với danh mục chuẩn (không trùng tên)
        const combined = [...normalizedBackend];
        const existingNames = new Set(normalizedBackend.map(h => (h.name || '').toLowerCase().trim()));
        fullHotelList.forEach(h => {
          if (!existingNames.has((h.name || '').toLowerCase().trim())) {
            combined.push(h);
          }
        });

        setAffiliateServices(combined);
        return;
      }

      // KHO DỮ LIỆU ĐỊA ĐIỂM THỰC TẾ (100% NHÀ HÀNG & DỊCH VỤ THẬT THEO GOOGLE MAPS)
      const fallbackList = [];
      if (cat === 'food') {
        // 1. Quán ăn thực tế từ servicesData.json (Hạ Long, Ninh Bình, Sa Pa, Hà Giang, Cao Bằng)
        if (Array.isArray(servicesData)) {
          const rawRestaurants = servicesData.filter(x => x.type === 'NHÀ HÀNG' || x.category === 'Ăn uống');
          rawRestaurants.forEach((r, idx) => {
            const desc = r.desc || '';
            let region = 'Việt Nam';
            if (desc.includes('Hạ Long') || desc.includes('Yên Tử') || desc.includes('Cô Tô') || desc.includes('Bình Liêu') || desc.includes('Quan Lạn')) {
              region = 'Quảng Ninh';
            } else if (desc.includes('Fansipan') || desc.includes('Cát Cát') || desc.includes('Ô Quy Hồ') || desc.includes('Mường Hoa') || desc.includes('Bắc Hà')) {
              region = 'Sa Pa / Lào Cai';
            } else if (desc.includes('Tràng An') || desc.includes('Tam Cốc') || desc.includes('Bái Đính') || desc.includes('Hoa Lư') || desc.includes('Hang Múa')) {
              region = 'Ninh Bình';
            } else if (desc.includes('Lũng Cú') || desc.includes('Mã Pí Lèng') || desc.includes('Đồng Văn') || desc.includes('Hoàng Su Phì') || desc.includes('Vương')) {
              region = 'Hà Giang';
            } else if (desc.includes('Bản Giốc') || desc.includes('Ngườm Ngao') || desc.includes('Pác Bó') || desc.includes('Thăng Hen') || desc.includes('Mắt thần')) {
              region = 'Cao Bằng';
            }
            const cleanDest = desc.replace('Nhà hàng tại ', '').trim() || region;

            fallbackList.push({
              id: `real-food-${idx}`,
              name: r.title,
              category: 'food',
              destination: cleanDest,
              region: region,
              notes: r.desc ? `${r.desc} - Món ngon đặc sắc, được du khách đánh giá cao (${r.rating || 4.8}★).` : 'Nhà hàng đặc sản ẩm thực địa phương nổi tiếng.',
              rating: r.rating || 4.8,
              reviews: r.reviews || 120,
              affiliateUrl: `https://www.google.com/maps/search/${encodeURIComponent(r.title + ' near ' + cleanDest)}`
            });
          });
        }

        // 2. Bổ sung các quán ăn & nhà hàng trứ danh chuẩn Google Maps cho Đà Nẵng, Hà Nội, Hội An, Đà Lạt
        const extraRestaurants = [
          // Đà Nẵng
          { name: "Bánh tráng cuốn thịt heo Quán Trần", destination: "Hải Châu & Bãi biển Mỹ Khê", region: "Đà Nẵng", notes: "Đặc sản bánh tráng cuốn thịt heo 2 đầu da nước mắm nêm gia truyền trứ danh.", rating: 4.8 },
          { name: "Hải sản Bé Mặn", destination: "Đường Võ Nguyên Giáp, Biển Mỹ Khê", region: "Đà Nẵng", notes: "Hải sản tươi sống bắt tại hồ cực kỳ đông vui, tôm hùm, cua ghẹ sốt me tươi rói.", rating: 4.8 },
          { name: "Bún chả cá Bà Phiến", destination: "Đường Lê Hồng Phong, Hải Châu", region: "Đà Nẵng", notes: "Quán bún chả cá gia truyền hơn 30 năm nức tiếng, chả cá thu dai ngọt thanh.", rating: 4.7 },
          { name: "Bánh xèo Bà Dưỡng", destination: "Kiệt Hoàng Diệu, Hải Châu", region: "Đà Nẵng", notes: "Bánh xèo giòn rụm cuốn nem lụi nước chấm gan đậu phộng đậm đà thơm béo.", rating: 4.8 },
          { name: "Mì Quảng Ếch Bếp Trang", destination: "Ông Ích Khiêm & Pasteur", region: "Đà Nẵng", notes: "Mì Quảng ếch om niêu đất trên mẹt lá chuối độc đáo, nước dùng sánh béo đậm vị.", rating: 4.8 },
          { name: "Nhà hàng Madame Lân", destination: "Đường Bạch Đằng, Bờ sông Hàn", region: "Đà Nẵng", notes: "Không gian kiến trúc phố cổ ven sông Hàn lãng mạn, ẩm thực 3 miền tinh tế.", rating: 4.8 },
          { name: "Cơm gà Bà Buội Đà Nẵng", destination: "Đường Hồ Nghinh, Sơn Trà", region: "Đà Nẵng", notes: "Cơm gà xé vàng óng ả, cay ấm thơm gừng tỏi đậm đà khó quên.", rating: 4.7 },
          { name: "Hải sản Năm Đảnh", destination: "Trần Quang Khải, Thọ Quang, Sơn Trà", region: "Đà Nẵng", notes: "Quán hải sản bình dân nổi tiếng, ốc hương rang muối, ghẹ rang me ngập sốt.", rating: 4.7 },

          // Hà Nội
          { name: "Phở Thìn Lò Đúc", destination: "Phố Lò Đúc, Hai Bà Trưng", region: "Hà Nội", notes: "Phở bò xào tái lăn áp chảo thơm nức mũi ngập tràn hành hoa béo ngậy.", rating: 4.8 },
          { name: "Bún chả Hương Liên (Bún chả Obama)", destination: "Lê Văn Hưu, Hai Bà Trưng", region: "Hà Nội", notes: "Quán bún chả tổng thống Obama từng ghé thưởng thức, chả nướng than hoa thơm lừng.", rating: 4.8 },
          { name: "Chả cá Lã Vọng", destination: "Phố Chả Cá, Hoàn Kiếm", region: "Hà Nội", notes: "Đặc sản chả cá lăng truyền thống chiên mỡ sôi tại bàn ăn kèm thì là bún tươi.", rating: 4.7 },
          { name: "Bún đậu mắm tôm Hàng Khay", destination: "Ngõ Hàng Khay, Hoàn Kiếm", region: "Hà Nội", notes: "Mẹt bún đậu đầy ắp chả cốm giòn thơm, nem rán giòn tan ngay sát Hồ Gươm.", rating: 4.7 },
          { name: "Cà phê Giảng", destination: "Nguyễn Hữu Huân, Phố Cổ", region: "Hà Nội", notes: "Cái nôi của cà phê trứng Hà thành từ năm 1946 béo ngậy thơm lừng.", rating: 4.9 },

          // Hội An
          { name: "Cơm gà Bà Buội Hội An", destination: "Phan Chu Trinh, Phố Cổ", region: "Hội An", notes: "Thương hiệu cơm gà phố Hội danh tiếng từ những năm 1950.", rating: 4.8 },
          { name: "Bánh mì Phượng", destination: "Phan Chu Trinh, Cẩm Châu", region: "Hội An", notes: "Tiệm bánh mì trứ danh được đầu bếp thế giới ngợi ca là ngon nhất Việt Nam.", rating: 4.9 },
          { name: "Cao lầu Thanh", destination: "Thái Phiên, Phố Cổ", region: "Hội An", notes: "Cao lầu sợi vàng dẻo thịt xíu đậm đà tóp mỡ giòn rụm đúng điệu.", rating: 4.8 },

          // Đà Lạt
          { name: "Lẩu gà lá é Tao Ngộ", destination: "Đường 3 Tháng 4", region: "Đà Lạt", notes: "Nồi lẩu gà lá é cay nồng the the giữa khí trời se lạnh phố núi.", rating: 4.8 },
          { name: "Bánh căn Lệ", destination: "Yersin, Phường 10", region: "Đà Lạt", notes: "Bánh căn giòn xốp nhân trứng cút bò bằm chấm nước mắm xíu mại mỡ hành.", rating: 4.8 },
          { name: "Quán nướng Chu", destination: "KQH Ánh Sáng, Phường 1", region: "Đà Lạt", notes: "Quán nướng ngói bò tơ, heo rừng cay thơm nức tiếng về đêm tại Đà Lạt.", rating: 4.7 }
        ];

        extraRestaurants.forEach((r, idx) => {
          fallbackList.push({
            id: `extra-food-${idx}`,
            name: r.name,
            category: 'food',
            destination: r.destination,
            region: r.region,
            notes: r.notes,
            rating: r.rating,
            affiliateUrl: `https://www.google.com/maps/search/${encodeURIComponent(r.name + ' near ' + r.destination)}`
          });
        });
      }

      setAffiliateServices(fallbackList);
    } catch (e) {
      console.error('Lỗi tải danh sách dịch vụ đối tác:', e);
      setAffiliateServices([]);
    } finally {
      setLoadingAffiliate(false);
    }
  };

  // Chuẩn hóa chuỗi bỏ dấu tiếng Việt để tìm kiếm không phụ thuộc dấu
  const removeDiacritics = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  };

  // Lọc danh sách dịch vụ Affiliate theo từ khóa ô tìm kiếm (tự động khớp với Ninh Bình, Hạ Long, v.v.)
  const filteredAffiliateServices = useMemo(() => {
    if (!affiliateServices || affiliateServices.length === 0) return [];
    const kw = (mapSearchInput || '').trim().toLowerCase();
    if (!kw) return affiliateServices;
    const kwNorm = removeDiacritics(kw);
    return affiliateServices.filter(s => {
      const targetStr = `${s.name || ''} ${s.destination || ''} ${s.region || ''} ${s.notes || ''}`.toLowerCase();
      const targetNorm = removeDiacritics(targetStr);
      return targetStr.includes(kw) || targetNorm.includes(kwNorm);
    });
  }, [affiliateServices, mapSearchInput]);

  // Helper tạo URL Google Maps Embed chuẩn xác (không bao giờ bị xám hay trắng bản đồ)
  const getGoogleMapsEmbedUrl = () => {
    const loc = (foodMapModal.currentKeyword || extractLocationKeyword(foodMapModal.activityItem, trip) || trip?.destination || '').trim();
    const categoryDefault = foodMapModal.category === 'hotel' ? 'khách sạn' : foodMapModal.category === 'transport' ? 'bến xe' : 'quán ăn, nhà hàng';
    let q = (mapQuery || '').trim();
    if (!q || q === 'hotels' || q === 'restaurants' || q === 'transit station' || q === 'khách sạn' || q === 'quán ăn' || q === 'bến xe') {
      q = categoryDefault;
    }
    let finalSearch = q;
    if (loc && !q.toLowerCase().includes(loc.toLowerCase())) {
      finalSearch = `${q}, ${loc}`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(finalSearch)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  // Helper tạo URL Google Maps tìm kiếm mở tab mới
  const getGoogleMapsSearchUrl = () => {
    const loc = (foodMapModal.currentKeyword || extractLocationKeyword(foodMapModal.activityItem, trip) || trip?.destination || '').trim();
    const categoryDefault = foodMapModal.category === 'hotel' ? 'khách sạn' : foodMapModal.category === 'transport' ? 'bến xe' : 'quán ăn';
    let q = (mapSearchInput || mapQuery || '').trim();
    if (!q || q === 'hotels' || q === 'restaurants' || q === 'transit station' || q === 'khách sạn' || q === 'quán ăn' || q === 'bến xe') {
      q = categoryDefault;
    }
    let finalSearch = q;
    if (loc && !q.toLowerCase().includes(loc.toLowerCase())) {
      finalSearch = `${q}, ${loc}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(finalSearch)}`;
  };

  // Hàm mở Modal Dịch vụ (Ăn uống, Cư trú, Nhà xe)
  const handleOpenFoodModal = (item, category = 'food') => {
    const autoKeyword = extractLocationKeyword(item, trip);
    const targetQuery = item.location || item.destination || (trip?.destination ? `${item.title}, ${trip.destination}` : item.title);
    const formattedTitle = formatItemTitle(item.title);
    
    // Tự động điền địa danh của chặng (ví dụ: Ninh Bình) lên thanh tìm kiếm
    setMapSearchInput(autoKeyword);

    const defaultQueryKeyword = category === 'hotel' ? 'khách sạn' : category === 'transport' ? 'bến xe' : 'quán ăn';
    const initialMapQuery = autoKeyword ? `${defaultQueryKeyword} ${autoKeyword}` : defaultQueryKeyword;
    setMapQuery(initialMapQuery);
    setActiveFoodTab('real');

    setFoodMapModal({
      isOpen: true,
      query: targetQuery,
      title: formattedTitle,
      activityItem: item,
      category: category,
      aiSuggestions: [],
      loadingAi: true,
      errorAi: null,
      currentKeyword: autoKeyword
    });

    // Tải danh sách địa điểm thực tế chuẩn xác (Khách sạn, Nhà xe hoặc Quán ăn)
    fetchAffiliateServices(category);
    const defaultSearchKeyword = category === 'hotel' ? 'khách sạn' : category === 'transport' ? 'bến xe' : 'quán ăn';
    fetchRealPoiSuggestions(autoKeyword ? `${defaultSearchKeyword} ${autoKeyword}` : defaultSearchKeyword, targetQuery, category);
    if (category === 'food') {
      fetchAISuggestions(autoKeyword, targetQuery);
    }
  };

  // Thực thi tìm kiếm đồng bộ khi người dùng Enter hoặc click Thẻ lọc nhanh
  const handlePerformSearch = (keyword) => {
    const trimmed = (keyword || '').trim();
    const defaultMapQuery = foodMapModal.category === 'hotel' ? 'khách sạn' : foodMapModal.category === 'transport' ? 'bến xe' : 'quán ăn';
    const queryForMap = trimmed || defaultMapQuery;

    // Luồng 1 (Tức thì): Cập nhật URL bản đồ iframe Google Maps sang từ khóa mới
    setMapQuery(queryForMap);

    // Luồng 2 (Nominatim): Tìm kiếm địa điểm thật
    fetchRealPoiSuggestions(trimmed || defaultMapQuery, foodMapModal.query, foodMapModal.category);

    // Luồng 3 (AI): Lấy gợi ý phân tích từ Gemini
    fetchAISuggestions(trimmed, foodMapModal.query);
  };

  // Xử lý thêm nhà hàng/địa điểm vào lịch trình chuyến đi
  const handleAddRestaurantToItinerary = async (placeItem, source = 'food') => {
    if (!selectedTripId) {
      alert('Không tìm thấy chuyến đi để thêm hoạt động.');
      return;
    }

    const activeCategory = placeItem.category || foodMapModal.category || source || 'food';
    const isHotel = activeCategory === 'hotel';
    const isTransport = activeCategory === 'transport';
    const placeName = placeItem.name || placeItem.title || (placeItem.display_name ? placeItem.display_name.split(',')[0].trim() : (isHotel ? 'Khách sạn' : isTransport ? 'Trạm xe' : 'Quán ăn'));

    // Nếu là dịch vụ Đặt phòng (hotel) hoặc Vé xe (transport) -> Hiện modal yêu cầu đặt dịch vụ
    if (isHotel || isTransport) {
      setServiceNoticeModal({
        isOpen: true,
        type: 'require_booking',
        serviceName: placeName,
        serviceCategory: isHotel ? 'hotel' : 'transport',
        stageTitle: foodMapModal.title || formatItemTitle(foodMapModal.activityItem?.title || 'Chặng lịch trình'),
        actionUrl: placeItem.actionUrl || '',
        updatedItem: null
      });
      return;
    }

    // Nếu là Nhà hàng / Quán ăn -> Lưu vào chặng hiện tại và thay vào phần Điểm đến (destination)
    const itemKey = `${placeName}-${activeCategory}`;
    setAddingRestaurantKey(itemKey);

    try {
      const targetActivity = items.find(i => i.id === foodMapModal.activityItem?.id) || foodMapModal.activityItem;

      if (targetActivity && targetActivity.id) {
        const noteLine = `Ẩm thực: ${placeName}`;
        const existingNotes = (targetActivity.notes || '').trim();
        const updatedNotes = existingNotes.includes(placeName)
          ? existingNotes
          : (existingNotes ? `${existingNotes}\n${noteLine}` : noteLine);

        const updatedItem = {
          ...targetActivity,
          destination: placeName,
          notes: updatedNotes
        };

        await api.put(`/Itinerary/${targetActivity.id}`, updatedItem);

        // Cập nhật ngay state items trên giao diện để phần Thông tin chi tiết hiển thị Điểm đến mới
        setItems(prev => prev.map(i => i.id === targetActivity.id ? { ...i, destination: placeName, notes: updatedNotes } : i));
        setFoodMapModal(prev => ({
          ...prev,
          activityItem: prev.activityItem ? { ...prev.activityItem, destination: placeName, notes: updatedNotes } : prev.activityItem
        }));
        if (selectedInfoItem && selectedInfoItem.id === targetActivity.id) {
          setSelectedInfoItem(prev => ({ ...prev, destination: placeName, notes: updatedNotes }));
        }

        setAddedRestaurants(prev => ({ ...prev, [itemKey]: true }));
        setServiceNoticeModal({
          isOpen: true,
          type: 'restaurant_added',
          serviceName: placeName,
          serviceCategory: 'food',
          stageTitle: formatItemTitle(targetActivity.title),
          actionUrl: '',
          updatedItem
        });
      } else {
        // Fallback nếu không gắn với chặng cụ thể thì tạo mới hoạt động trong lịch trình
        const baseDate = trip?.startDate ? new Date(trip.startDate) : new Date();
        const startTime = new Date(baseDate);
        startTime.setHours(12, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 90 * 60000);

        const newItineraryPayload = {
          title: `Thưởng thức ẩm thực tại ${placeName}`,
          location: placeItem.address || trip?.destination || placeName,
          destination: placeName,
          notes: placeItem.reason || `Ẩm thực: ${placeName}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          transport: 'Tự túc',
          assignee: 'Cả nhóm',
          status: 'Chưa bắt đầu'
        };

        const createRes = await api.post(`/Itinerary/${selectedTripId}`, newItineraryPayload);
        const createdItem = createRes.data;
        setItems(prev => [...prev, createdItem]);
        setAddedRestaurants(prev => ({ ...prev, [itemKey]: true }));
        setServiceNoticeModal({
          isOpen: true,
          type: 'restaurant_added',
          serviceName: placeName,
          serviceCategory: 'food',
          stageTitle: formatItemTitle(createdItem.title),
          actionUrl: '',
          updatedItem: createdItem
        });
      }
    } catch (err) {
      console.error('Lỗi khi thêm nhà hàng vào lịch trình:', err);
      alert('Không thể thêm nhà hàng vào lịch trình. Vui lòng thử lại.');
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
      const sampleItem = dayItems.find(i => !i.isPlanB) || dayItems[0];
      let targetDate = sampleItem ? sampleItem.startTime : new Date().toISOString();
      if (dateStr && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          targetDate = new Date(Date.UTC(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0)).toISOString();
        }
      }
      
      const res = await api.post(`/trips/${selectedTripId}/itinerary/generate-plan-b`, {
        date: targetDate,
        itemIds: dayItems.map(i => i.id)
      });

      if (res.data?.items && Array.isArray(res.data.items) && res.data.items.length >= items.length) {
        setItems(res.data.items.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      } else {
        const refetchRes = await api.get(`/Itinerary/${selectedTripId}`);
        setItems(refetchRes.data);
      }

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
            onClick={() => setIsAiChatOpen(prev => !prev)}
            className={`gemini-ai-toggle-btn ${isAiChatOpen ? 'active' : ''}`}
            title={isAiChatOpen ? "Thu gọn khung chat Gemini AI" : "Mở khung chat Gemini AI"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span>{isAiChatOpen ? 'Thu gọn Gemini AI' : 'Gemini AI'}</span>
          </button>

          <button
            type="button"
            disabled={isSharingTrip}
            onClick={handleToggleShareTrip}
            style={{
              background: trip.isPublic ? '#122B29' : '#ffffff',
              color: trip.isPublic ? '#d2f47d' : '#122B29',
              border: trip.isPublic ? '1.5px solid #d2f47d' : '1.5px solid #cbd5e1',
              padding: '9px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: trip.isPublic ? '0 0 14px rgba(210, 244, 125, 0.35)' : '0 2px 6px rgba(0,0,0,0.06)'
            }}
            title={trip.isPublic ? "Bấm để hủy chia sẻ" : "Chia sẻ lịch trình này cho mọi người dùng làm template"}
          >
            {isSharingTrip ? (
              <Loader2 size={16} className="animate-spin" />
            ) : trip.isPublic ? (
              <Globe size={16} color="#d2f47d" />
            ) : (
              <Share2 size={16} color="#122B29" />
            )}
            <span>{trip.isPublic ? '✓ Đang chia sẻ mẫu' : 'Share lịch trình (Làm Template)'}</span>
          </button>
        </div>
      </div>

      {/* Removed page-header to save space */}

      <TripNavigation selectedTripId={selectedTripId} />


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

      <div className={`split-layout ${!isAiChatOpen ? 'ai-collapsed' : ''}`}>
        {/* Left pane: AI Chat (Collapsible) */}
        {isAiChatOpen && (
          <div className="chat-container">
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsAiChatOpen(false)}
                className="chat-header-toggle"
                title="Bấm vào icon Gemini AI để thu gọn khung chat"
              >
                <span className="gemini-icon-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </span>
                <span>{isGeminiConnected ? 'Gemini AI' : 'Trợ lý Lịch trình AI'}</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isGeminiConnected ? (
                  <button 
                    onClick={handleLogoutGemini}
                    title="Đăng xuất Gemini"
                    style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsAiChatOpen(false)}
                  className="chat-minimize-btn"
                  title="Thu gọn khung chat AI"
                >
                  ✕
                </button>
              </div>
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
                    <button className="btn-explore-sm" onClick={handleGenerateAi} disabled={isChatting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={14} /> Tạo mới toàn bộ lịch trình
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
        )}

        {/* Nút nổi Gemini AI để mở/đóng nhanh trên cả Web và Mobile */}
        <button
          type="button"
          className={`gemini-ai-fab ${isAiChatOpen ? 'is-open' : ''}`}
          onClick={() => setIsAiChatOpen(prev => !prev)}
          title={isAiChatOpen ? "Thu gọn chat Gemini AI" : "Mở chat Gemini AI"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span className="gemini-ai-fab-label">{isAiChatOpen ? 'Đóng AI' : 'Gemini AI'}</span>
        </button>

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
                const matched = publicTemplates.filter(t => t.id !== trip?.id && matchDestination(trip.destination, t.destination, t.title));

                if (matched.length === 0) {
                  return (
                    <div 
                      className="suggested-templates-banner" 
                      style={{ 
                        background: 'linear-gradient(135deg, #132725 0%, #1a3835 100%)', 
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '24px 28px'
                      }}
                    >
                      <div 
                        className="suggested-banner-badge" 
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          borderColor: 'rgba(255, 255, 255, 0.25)', 
                          color: '#e2e8f0' 
                        }}
                      >
                        <Compass size={12} />
                        <span>CHƯA CÓ PLAN MẪU</span>
                      </div>
                      <h3 className="suggested-banner-title">
                        Chưa có plan mẫu cho chuyến đi này
                      </h3>
                      <p className="suggested-banner-subtitle" style={{ marginBottom: '20px' }}>
                        Hiện tại chưa có lịch trình mẫu nào phù hợp với điểm đến <strong>{getShortLocation(trip.destination) || 'này'}</strong>. Bạn có thể nhờ Trợ lý Gemini AI lên kế hoạch tự động trong vài giây, xem tất cả template khác hoặc tự tạo hoạt động theo ý muốn!
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleGenerateAi}
                          disabled={isChatting}
                          style={{
                            background: '#d2f47d',
                            color: '#122B29',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Sparkles size={15} />
                          <span>Nhờ Gemini AI tạo lịch trình</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTemplateModal(true)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Flame size={14} color="#d2f47d" />
                          <span>Xem tất cả {publicTemplates.length} Template khác</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(true)}
                          style={{
                            background: 'transparent',
                            border: '1px dashed rgba(255, 255, 255, 0.35)',
                            color: 'rgba(255, 255, 255, 0.9)',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '13.5px',
                            cursor: 'pointer'
                          }}
                        >
                          + Tự thêm hoạt động
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="suggested-templates-banner">
                    <div className="suggested-banner-badge">
                      <Sparkles size={12} />
                      <span>GỢI Ý TỰ ĐỘNG THEO ĐIỂM ĐẾN</span>
                    </div>
                    <h3 className="suggested-banner-title">
                      Lịch trình mẫu đề xuất cho {getShortLocation(trip.destination)}
                    </h3>
                    <p className="suggested-banner-subtitle">
                      Áp dụng các chặng và hoạt động mẫu vào ngay chuyến đi này chỉ với 1 click, hoặc tùy chỉnh thêm bớt theo ý muốn.
                    </p>

                    <div className="suggested-banner-grid">
                      {matched.map(tpl => {
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
                <p style={{color: '#6E807F', marginBottom: 20}}>
                  Bạn có thể nhờ Trợ lý AI tạo tự động, áp dụng lịch trình mẫu hoặc bấm "Thêm Hoạt động" để tự lên kế hoạch thủ công.
                </p>
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
                    <div className="timeline-date-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* TOGGLE SWITCH NỔI BẬT: Kích hoạt Kế hoạch B */}
                      <button
                        type="button"
                        className={`plan-b-toggle-btn ${isPlanBActive ? 'active' : ''}`}
                        onClick={() => handleTogglePlanB(date, dayItems)}
                        disabled={isGenerating}
                        title="Kích hoạt phương án thay thế hoạt động trong nhà"
                      >
                        <span style={{marginRight: 4}}><CloudRain size={16}/></span>
                        <span>{isPlanBActive ? 'Đang bật Kế hoạch B' : 'Kế hoạch B'}</span>
                        <div className="plan-b-switch-pill">
                          <div className="plan-b-switch-thumb"></div>
                        </div>
                        {isGenerating && <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: 4 }}>Đang tạo...</span>}
                      </button>

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

                      <button className="btn-add-activity" onClick={() => setShowAddForm(true)} title="Thêm Hoạt động mới" style={{ padding: '8px', minWidth: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Plus size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                
                <div className="timeline-list">
                  {displayedItems.map((item, index) => {
                    const passed = isItemPassed(item);

                    return (
                      <div key={item.id} className={`timeline-item ${passed ? 'passed' : ''}`}>
                        <div 
                          className="timeline-dot" 
                          style={{
                            ...(item.isPlanB ? { background: '#0284c7', borderColor: '#e0f2fe' } : {}),
                            ...(passed ? { background: '#122B29', borderColor: '#d2f47d', boxShadow: 'none' } : {})
                          }}
                        ></div>
                        <div className={`itinerary-card ${item.isPlanB ? 'plan-b' : ''} ${passed ? 'passed' : ''}`}>
                            <div className="itinerary-card-header">
                              <div className="itinerary-time" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {item.isPlanB && <span title="Hoạt động dự phòng trong nhà (Plan B)" style={{ display: 'flex', alignItems: 'center' }}><Umbrella size={14}  /></span>}
                                {new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} 
                                {item.endTime && item.endTime !== item.startTime ? ` - ${new Date(item.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}` : ''}
                                {item.isPlanB && (
                                  <span className="plan-b-badge" style={passed ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' } : {}}>
                                    <Umbrella size={14} style={{marginRight: 4}} /> Plan B (Trong nhà)
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Selective Disabling 1: Nút trạng thái / Lưu */}
                                {passed ? (
                                  <span 
                                    style={{ 
                                      padding: '4px 12px', 
                                      fontSize: '12px', 
                                      borderRadius: '6px', 
                                      background: '#d2f47d', 
                                      color: '#122B29', 
                                      border: 'none',
                                      fontWeight: '700',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      userSelect: 'none'
                                    }}
                                    title="Hoạt động đã kết thúc trong quá khứ hoặc đã hoàn thành"
                                  >
                                    <Check size={14} strokeWidth={3} /> Đã hoàn thành
                                  </span>
                                ) : null}

                                {/* Nút Hỏi AI: Cho phép tương tác khi chưa qua */}
                                {!passed && (
                                  <button 
                                    className="btn-action-icon btn-ask-ai" 
                                    onClick={() => {
                                      setIsAiChatOpen(true);
                                      setMessages(prev => [...prev, { role: 'ai', content: `Bạn muốn thay đổi gì ở giai đoạn "${formatItemTitle(item.title)}"?` }]);
                                      setTimeout(() => {
                                        const input = document.querySelector('.chat-input');
                                        if(input) input.focus();
                                      }, 120);
                                    }}
                                    title="Hỏi trợ lý AI"
                                  >
                                    ?
                                  </button>
                                )}

                                {/* Nút Xem thông tin chi tiết: LUÔN CHO PHÉP BẤM NGAY CẢ KHI ĐÃ QUA */}
                                <button 
                                  className="btn-action-icon btn-info" 
                                  style={passed ? { color: '#fff', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' } : {}}
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
                                  style={passed ? { color: '#fff', borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' } : {}}
                                  onClick={() => !passed && handleDelete(item.id)} 
                                  disabled={passed}
                                  title={passed ? "Không thể xóa hoạt động trong quá khứ" : "Xóa"}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </div>
                            </div>

                          {/* Tiêu đề & Plan B Notes */}
                          <div className="itinerary-card-body">
                            <h4 className="itinerary-card-title">{formatItemTitle(item.title)}</h4>
                            {item.isPlanB && item.notes && (
                              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: passed ? '#d2f47d' : '#0369a1', background: passed ? 'rgba(210, 244, 125, 0.1)' : '#f0f9ff', padding: '6px 10px', borderRadius: 8, border: passed ? '1px solid rgba(210, 244, 125, 0.2)' : '1px solid #e0f2fe' }}>
                                <Lightbulb size={16} style={{marginRight: 4, flexShrink: 0, marginTop: 2, color: "inherit"}} /> <b>Phương án Plan B:</b> {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Footer Bản đồ & Khám phá dịch vụ: Mở rộng khi chưa qua HOẶC khi đã click Chevron */}
                          {!passed && (
                            <div className="itinerary-card-footer">
                              <div className="itinerary-services">
                                <button 
                                  className="service-btn" 
                                  onClick={() => handleOpenFoodModal(item, 'food')}
                                  title="Khám phá ẩm thực & nhà hàng do AI gợi ý quanh khu vực này"
                                >
                                  <Utensils size={16} />
                                  Khám phá ẩm thực
                                </button>
                                <button 
                                  className="service-btn" 
                                  onClick={() => handleOpenFoodModal(item, 'hotel')}
                                  title="Tìm kiếm khách sạn & nơi lưu trú"
                                >
                                  <Building size={16} />
                                  Tìm khách sạn
                                </button>
                                <button 
                                  className="service-btn" 
                                  onClick={() => handleOpenFoodModal(item, 'transport')}
                                  title="Tìm kiếm phương tiện di chuyển"
                                >
                                  <Bus size={16} />
                                  Di chuyển
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
              <p style={{ marginBottom: '8px' }}><strong>Điểm đến:</strong> <br/>{selectedInfoItem.destination || 'Vui lòng chọn dịch vụ'}</p>
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
                  {foodMapModal.category === 'hotel' ? <><Building size={20} style={{marginRight: 6}} /> Tìm khách sạn</> : foodMapModal.category === 'transport' ? <><Bus size={20} style={{marginRight: 6}} /> Di chuyển</> : <><Utensils size={20} style={{marginRight: 6}} /> Khám phá ẩm thực & nhà hàng</>}
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
                    <Search className="food-map-search-icon" size={16} />
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
                      placeholder={`Gõ tìm ${foodMapModal.category === 'hotel' ? 'khách sạn, homestay' : foodMapModal.category === 'transport' ? 'bến xe, ga tàu' : 'quán ăn, cafe, siêu thị'} thực tế quanh đây...`}
                    />
                    {mapSearchInput && (
                      <button 
                        type="button" 
                        className="food-map-search-clear"
                        onClick={() => {
                          setMapSearchInput('');
                          handlePerformSearch('');
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
                    {(foodMapModal.category === 'hotel' ? [
                      { id: 'all_hotels', name: 'Khách sạn', label: <><Building size={14} style={{marginRight: 4}} /> Khách sạn</>, query: 'hotels', aiKeyword: '' },
                      { id: 'resort', name: 'Resort', label: <><Map size={14} style={{marginRight: 4}} /> Resort</>, query: 'resort', aiKeyword: 'resort' },
                      { id: 'homestay', name: 'Homestay', label: <><MapPin size={14} style={{marginRight: 4}} /> Homestay</>, query: 'homestay', aiKeyword: 'homestay' },
                      { id: 'motel', name: 'Nhà nghỉ', label: <><Building size={14} style={{marginRight: 4}} /> Nhà nghỉ</>, query: 'nhà nghỉ', aiKeyword: 'nhà nghỉ' }
                    ] : foodMapModal.category === 'transport' ? [
                      { id: 'all_transit', name: 'Bến xe', label: <><Bus size={14} style={{marginRight: 4}} /> Bến xe</>, query: 'transit station', aiKeyword: '' },
                      { id: 'train', name: 'Ga tàu', label: <><Map size={14} style={{marginRight: 4}} /> Ga tàu</>, query: 'train station', aiKeyword: 'ga tàu' },
                      { id: 'airport', name: 'Sân bay', label: <><MapPin size={14} style={{marginRight: 4}} /> Sân bay</>, query: 'airport', aiKeyword: 'sân bay' }
                    ] : [
                      { id: 'all', name: 'Quán ăn', label: <><Utensils size={14} style={{marginRight: 4}} /> Quán ăn</>, query: 'restaurants', aiKeyword: '' },
                      { id: 'cafe', name: 'Cafe', label: <><Coffee size={14} style={{marginRight: 4}} /> Cafe</>, query: 'cafe', aiKeyword: 'quán cafe' },
                      { id: 'veggie', name: 'Đồ chay', label: <><Leaf size={14} style={{marginRight: 4}} /> Đồ chay</>, query: 'đồ chay', aiKeyword: 'quán chay' },
                      { id: 'bar', name: 'Quán nhậu', label: <><Beer size={14} style={{marginRight: 4}} /> Quán nhậu</>, query: 'quán nhậu', aiKeyword: 'quán nhậu' },
                      { id: 'mart', name: 'Cửa hàng tiện lợi', label: <><ShoppingCart size={14} style={{marginRight: 4}} /> Cửa hàng tiện lợi</>, query: 'cửa hàng tiện lợi', aiKeyword: 'cửa hàng tiện lợi' }
                    ]).map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        className={`food-map-chip ${mapQuery === chip.query ? 'active' : ''}`}
                        onClick={() => {
                          setMapSearchInput((chip.query === 'restaurants' || chip.query === 'hotels' || chip.query === 'transit station') ? '' : (chip.name || chip.query));
                          handlePerformSearch(chip.query);
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* 3. Nội dung: Phân loại theo Dịch vụ */}
                <div className="food-tab-content">
                    <div className="food-tab-info-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {foodMapModal.category === 'hotel' ? <Building size={16} color="#2563eb" /> : foodMapModal.category === 'transport' ? <Bus size={16} color="#16a34a" /> : <Utensils size={16} color="#ea580c" />}
                        <strong>
                          {foodMapModal.category === 'hotel' 
                            ? 'Dịch vụ Cư trú đối tác liên kết' 
                            : foodMapModal.category === 'transport' 
                            ? 'Dịch vụ Nhà xe & Di chuyển liên kết' 
                            : 'Gợi ý Nhà hàng & Quán ăn nổi tiếng'}
                        </strong>
                        {mapSearchInput.trim() ? (
                          <span style={{ fontSize: '12px', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                            Khớp "{mapSearchInput}": {filteredAffiliateServices.length} địa điểm
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                            (Tất cả {affiliateServices.length} địa điểm)
                          </span>
                        )}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {mapSearchInput.trim() && (
                          <button
                            type="button"
                            onClick={() => setMapSearchInput('')}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: '#334155',
                              padding: '3px 8px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            title="Hiển thị toàn bộ danh sách dịch vụ"
                          >
                            Xem tất cả ({affiliateServices.length})
                          </button>
                        )}
                        {loadingAffiliate && (
                          <span style={{ color: "#0284c7", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", fontSize: '12px' }}>
                            <Clock size={14} /> Đang tải...
                          </span>
                        )}
                      </div>
                    </div>

                    {loadingAffiliate ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="food-skeleton-card">
                            <div className="skeleton-shimmer" style={{ height: '18px', width: '65%' }} />
                            <div className="skeleton-shimmer" style={{ height: '14px', width: '90%' }} />
                            <div className="skeleton-shimmer" style={{ height: '36px', width: '100%' }} />
                          </div>
                        ))}
                      </div>
                    ) : filteredAffiliateServices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                        {filteredAffiliateServices.map((item, idx) => {
                          const itemKey = `${item.name}-${item.category || foodMapModal.category}`;
                          const isAdded = !!addedRestaurants[itemKey];
                          const isAdding = addingRestaurantKey === itemKey;
                          const borderColor = foodMapModal.category === 'hotel' ? '#3b82f6' : foodMapModal.category === 'transport' ? '#16a34a' : '#ea580c';
                          const isHotel = foodMapModal.category === 'hotel' || item.category === 'hotel';
                          const isTransport = foodMapModal.category === 'transport' || item.category === 'transport';
                          const actionUrl = item.affiliateUrl || `https://www.google.com/maps/search/${encodeURIComponent(item.name + (item.destination ? ', ' + item.destination : (item.region ? ', ' + item.region : '')))}`;

                          return (
                            <article 
                              key={item.id || idx}
                              className={`food-card ${mapQuery === item.name ? 'preview-active' : ''}`}
                              onClick={() => handlePreviewMap(item.name)}
                              title="Click để xem trên bản đồ bên phải"
                              style={{ borderLeft: `4px solid ${borderColor}` }}
                            >
                              <div className="food-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 className="food-card-name" style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>
                                    {item.name}
                                  </h4>
                                  <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={11} /> {item.destination} • {item.region}
                                    {item.rating && (
                                      <span style={{ color: '#eab308', fontWeight: '700', marginLeft: '6px' }}>
                                        ⭐ {item.rating}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="food-card-type-badge">
                                  {isHotel ? (
                                    <><Building size={12} style={{ marginRight: 4 }} /> Cư trú</>
                                  ) : isTransport ? (
                                    <><Bus size={12} style={{ marginRight: 4 }} /> Nhà xe</>
                                  ) : (
                                    <><Utensils size={12} style={{ marginRight: 4 }} /> Quán ăn</>
                                  )}
                                </span>
                              </div>

                              {item.notes && (
                                <p style={{ margin: '6px 0', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                                  {item.notes}
                                </p>
                              )}

                              {/* Các nút hành động */}
                              <div className="food-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {actionUrl && (
                                  <a
                                    href={actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-food-action"
                                    style={{
                                      background: borderColor,
                                      color: 'white',
                                      textDecoration: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: '600',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      fontSize: '12px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    title={isHotel ? "Đặt phòng" : isTransport ? "Đặt vé xe" : "Xem quán ăn trên Google Maps"}
                                  >
                                    <ExternalLink size={12} /> {isHotel ? 'Đặt phòng ngay ↗' : isTransport ? 'Đặt vé xe ngay ↗' : 'Xem trên Google Maps ↗'}
                                  </a>
                                )}

                                <button
                                  type="button"
                                  className={`btn-food-add ${isAdded ? 'added' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddRestaurantToItinerary({
                                      name: item.name,
                                      address: `${item.destination}, ${item.region}`,
                                      specialty: isHotel ? 'Cư trú' : isTransport ? 'Nhà xe' : 'Ăn uống',
                                      reason: item.notes,
                                      category: isHotel ? 'hotel' : isTransport ? 'transport' : 'food',
                                      actionUrl: actionUrl
                                    }, isHotel ? 'hotel' : isTransport ? 'transport' : 'food');
                                  }}
                                  disabled={isAdding}
                                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px' }}
                                  title="Lưu địa điểm này vào lịch trình chuyến đi"
                                >
                                  {isAdding ? 'Đang thêm...' : isAdded ? '✓ Đã thêm vào lịch trình' : '➕ Thêm vào lịch trình'}
                                </button>

                                <button
                                  type="button"
                                  className="btn-food-action focus-map"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFocusMapRestaurant(item.name);
                                  }}
                                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px' }}
                                  title="Ghim bản đồ Google Maps bên cạnh"
                                >
                                  <Map size={13} style={{ marginRight: 2 }} /> Ghim
                                </button>

                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.name + ', ' + item.destination + ', ' + item.region)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-food-action"
                                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#475569' }}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Chỉ đường trên Google Maps"
                                >
                                  <Compass size={13} /> Chỉ đường
                                </a>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ margin: '16px', padding: '32px 16px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px', color: '#64748b', fontSize: '13px' }}>
                        <p style={{ margin: "0 0 6px 0" }}><MapPin size={26} color="#64748b" /></p>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#334155' }}>
                          {mapSearchInput.trim() 
                            ? `Không tìm thấy địa điểm nào khớp với từ khóa "${mapSearchInput}"` 
                            : `Chưa có dữ liệu địa điểm trong hệ thống.`}
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px' }}>
                          {mapSearchInput.trim() 
                            ? 'Bạn có thể bấm nút bên dưới để xem toàn bộ danh sách hoặc tìm trực tiếp trên Google Maps.' 
                            : 'Bấm nút bên dưới để tìm kiếm trực tiếp trên Google Maps.'}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {mapSearchInput.trim() && affiliateServices.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setMapSearchInput('')}
                              style={{
                                background: foodMapModal.category === 'hotel' ? '#2563eb' : foodMapModal.category === 'transport' ? '#16a34a' : '#ea580c',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600'
                              }}
                            >
                              Xem tất cả (${affiliateServices.length}) địa điểm
                            </button>
                          )}
                          <a
                            href={getGoogleMapsSearchUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#0d9488',
                              color: 'white',
                              textDecoration: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Compass size={15} /> Tìm trên Google Maps ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              {/* Nửa bên phải: Google Maps Embed Panel & Bản đồ trực quan */}
              <div className="food-map-panel">
                <div className="food-map-panel-bar">
                  <span>
                    Bản đồ: <strong>{mapQuery === 'restaurants' || mapQuery === 'quán ăn' ? 'Tất cả quán ăn' : mapQuery === 'hotels' || mapQuery === 'khách sạn' ? 'Tất cả khách sạn' : mapQuery === 'transit station' || mapQuery === 'bến xe' ? 'Tất cả bến xe' : mapQuery}</strong> quanh <em>{foodMapModal.currentKeyword || extractLocationKeyword(foodMapModal.activityItem, trip) || trip?.destination || 'khu vực'}</em>
                  </span>
                  {mapQuery && !['restaurants', 'quán ăn', 'hotels', 'khách sạn', 'transit station', 'bến xe'].includes(mapQuery.toLowerCase().trim()) && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const loc = foodMapModal.currentKeyword || extractLocationKeyword(foodMapModal.activityItem, trip) || trip?.destination || '';
                        setMapSearchInput(loc);
                        handlePerformSearch(foodMapModal.category === 'hotel' ? 'khách sạn' : foodMapModal.category === 'transport' ? 'bến xe' : 'quán ăn');
                      }}
                      className="food-map-reset-btn"
                    >
                      ↺ Về toàn khu vực
                    </button>
                  )}
                </div>

                <div className="food-map-iframe-wrapper">
                  <iframe
                    title={`Bản đồ ${foodMapModal.category === 'hotel' ? 'khách sạn' : foodMapModal.category === 'transport' ? 'bến xe' : 'quán ăn'} gần đây`}
                    src={getGoogleMapsEmbedUrl()}
                    className="food-map-iframe"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            <div className="food-map-modal-footer">
              <span>💡 Click thẻ để ghim vị trí trên bản đồ. Bấm <strong>"➕ Thêm vào lịch trình"</strong> để đưa vào kế hoạch chuyến đi.</span>
              <a 
                href={getGoogleMapsSearchUrl()} 
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

      {/* Modal Thông báo Đặt dịch vụ / Thêm nhà hàng vào lịch trình */}
      {serviceNoticeModal.isOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            padding: '16px'
          }}
          onClick={() => setServiceNoticeModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '28px 24px',
              borderRadius: '24px',
              background: '#ffffff',
              textAlign: 'center',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
              border: serviceNoticeModal.type === 'restaurant_added' ? '2px solid #10b981' : '2px solid #f59e0b'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: serviceNoticeModal.type === 'restaurant_added' ? '#ecfdf5' : '#fef3c7',
                color: serviceNoticeModal.type === 'restaurant_added' ? '#059669' : '#d97706'
              }}
            >
              {serviceNoticeModal.type === 'restaurant_added' ? (
                <CheckCircle size={30} />
              ) : (
                <AlertCircle size={30} />
              )}
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
              {serviceNoticeModal.type === 'restaurant_added'
                ? 'Đã lưu nhà hàng vào lịch trình!'
                : 'Vui lòng đặt dịch vụ'}
            </h3>

            {serviceNoticeModal.type === 'restaurant_added' ? (
              <div style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.6', marginBottom: '22px', textAlign: 'left', background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Chặng hoạt động:</strong> {serviceNoticeModal.stageTitle}
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Điểm đến mới:</strong> <span style={{ color: '#059669', fontWeight: '700' }}>{serviceNoticeModal.serviceName}</span>
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  ✓ Đã cập nhật vào mục <strong>Điểm đến</strong> trong phần <em>Thông tin chi tiết (i)</em> của chặng.
                </p>
              </div>
            ) : (
              <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', marginBottom: '22px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#b45309' }}>
                  Vui lòng đặt dịch vụ để thêm vào lịch trình!
                </p>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
                  Đối với dịch vụ <strong>{serviceNoticeModal.serviceCategory === 'hotel' ? 'đặt phòng lưu trú' : 'đặt vé xe di chuyển'}</strong> ({serviceNoticeModal.serviceName}), bạn vui lòng bấm đặt dịch vụ trước khi thêm vào lịch trình chuyến đi.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {serviceNoticeModal.type === 'restaurant_added' && serviceNoticeModal.updatedItem && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: '#059669', color: '#ffffff', padding: '10px 18px', borderRadius: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    const itemToView = serviceNoticeModal.updatedItem;
                    setServiceNoticeModal(prev => ({ ...prev, isOpen: false }));
                    handleCloseFoodModal();
                    setSelectedInfoItem(itemToView);
                  }}
                >
                  Xem thông tin chi tiết
                </button>
              )}

              {serviceNoticeModal.type === 'require_booking' && serviceNoticeModal.actionUrl && (
                <a
                  href={serviceNoticeModal.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: serviceNoticeModal.serviceCategory === 'hotel' ? '#2563eb' : '#16a34a',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                  onClick={() => setServiceNoticeModal(prev => ({ ...prev, isOpen: false }))}
                >
                  <ExternalLink size={15} />
                  {serviceNoticeModal.serviceCategory === 'hotel' ? 'Đặt phòng ngay ↗' : 'Đặt vé xe ngay ↗'}
                </a>
              )}

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => setServiceNoticeModal(prev => ({ ...prev, isOpen: false }))}
              >
                Đóng
              </button>
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
