import React, { useState, useEffect, useRef } from 'react';
import './LocationAutocomplete.css';

const LocationAutocomplete = ({ name, placeholder, value, onChange, className }) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      // Dùng Nominatim API (OpenStreetMap) miễn phí
      // Thêm email và accept-language để API ưu tiên tiếng Việt
      // Thêm countrycodes=vn để CHỈ TÌM KIẾM TẠI VIỆT NAM (tránh bị nhiễu)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&countrycodes=vn&addressdetails=1&limit=5&accept-language=vi&email=test@travelworkspace.com`);
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      const data = await res.json();
      setSuggestions(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Hiển thị một gợi ý lỗi để người dùng biết
      setSuggestions([{ place_id: 'error', display_name: 'Lỗi khi tải địa điểm, vui lòng thử lại' }]);
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setQuery(newVal);
    
    // Gửi sự kiện lên cha để cập nhật state form
    if (onChange) {
      onChange({ target: { name, value: newVal } });
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newVal);
    }, 500); // 500ms debounce
  };

  const handleSelectSuggestion = (suggestion) => {
    const selectedName = suggestion.display_name;
    setQuery(selectedName);
    setSuggestions([]);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: selectedName } });
    }
  };

  return (
    <div className="location-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        className={className || "form-input"}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => { 
          if (suggestions.length > 0) setIsOpen(true); 
          else if (query.length >= 2) fetchSuggestions(query);
        }}
        autoComplete="off"
      />
      {isOpen && (
        <ul className="suggestions-list">
          {loading && <li className="suggestion-item loading">Đang tìm kiếm...</li>}
          {!loading && suggestions.length === 0 && (
            <li className="suggestion-item no-results">Không tìm thấy địa điểm</li>
          )}
          {!loading && suggestions.map((item) => (
            <li 
              key={item.place_id} 
              className="suggestion-item" 
              onClick={() => handleSelectSuggestion(item)}
            >
              <div className="suggestion-primary">{item.name || item.display_name.split(',')[0]}</div>
              <div className="suggestion-secondary">{item.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;
