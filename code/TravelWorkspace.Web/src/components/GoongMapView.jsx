import React, { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';

const DEFAULT_COORDS = {
  'quảng ninh': [107.0500, 20.9500],
  'hạ long': [107.0500, 20.9500],
  'bãi cháy': [107.0345, 20.9580],
  'ninh bình': [105.9745, 20.2506],
  'tam cốc': [105.9224, 20.2185],
  'tràng an': [105.9189, 20.2541],
  'lào cai': [103.9715, 22.4856],
  'sa pa': [103.8438, 22.3364],
  'sapa': [103.8438, 22.3364],
  'hà giang': [104.9836, 22.8233],
  'đồng văn': [105.3619, 23.2789],
  'cao bằng': [106.2575, 22.6663],
  'bản giốc': [106.7237, 22.8540],
  'hà nội': [105.8391, 21.0285],
  'đà nẵng': [108.2022, 16.0544],
  'hội an': [108.3380, 15.8801],
  'đà lạt': [108.4583, 11.9404]
};

const getKnownCoords = (query) => {
  if (!query) return [105.8391, 21.0285]; // Mặc định Hà Nội
  const q = query.toLowerCase();
  for (const [key, coords] of Object.entries(DEFAULT_COORDS)) {
    if (q.includes(key)) return coords;
  }
  return [105.8391, 21.0285];
};

const GoongMapView = ({
  centerQuery = '',
  markers = [],
  activeMarkerName = '',
  onSelectMarker = null,
  maptilesKey = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'i35QoA3iGXO4AxEULDt5UKZl25lBD26JG6p9Lh2w',
  apiKey = import.meta.env.VITE_GOONG_API_KEY || '8t6CSznO6o66F5sPh3xw9uAvULdB0rKGGmEISOl2'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 1. Khởi tạo bản đồ Goong Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    goongjs.accessToken = maptilesKey;
    const initialCenter = getKnownCoords(centerQuery);

    const map = new goongjs.Map({
      container: mapContainerRef.current,
      style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${maptilesKey}`,
      center: initialCenter,
      zoom: 13,
      attributionControl: true
    });

    map.addControl(new goongjs.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      // Định vị theo geocode nếu có từ khóa địa điểm
      if (centerQuery && apiKey) {
        fetch(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(centerQuery)}&api_key=${apiKey}`)
          .then(res => res.json())
          .then(data => {
            const loc = data?.results?.[0]?.geometry?.location;
            if (loc && loc.lng && loc.lat) {
              map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, essential: true });
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
      setIsMapLoaded(false);
    };
  }, [maptilesKey]);

  // 2. Cập nhật vị trí khi centerQuery thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || !centerQuery) return;

    // Kiểm tra bộ tọa độ tĩnh trước
    const known = getKnownCoords(centerQuery);
    map.flyTo({ center: known, zoom: 13, essential: true });

    // Gọi thêm Geocode để lấy tọa độ chuẩn xác nhất
    if (apiKey) {
      fetch(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(centerQuery)}&api_key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          const loc = data?.results?.[0]?.geometry?.location;
          if (loc && loc.lng && loc.lat) {
            map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, essential: true });
          }
        })
        .catch(() => {});
    }
  }, [centerQuery, isMapLoaded, apiKey]);

  // 3. Render danh sách Marker quán ăn lên bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    // Xóa marker cũ
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!markers || markers.length === 0) return;

    const bounds = new goongjs.LngLatBounds();
    let validCount = 0;

    markers.forEach((item) => {
      const lng = item.lng || item.lon;
      const lat = item.lat;
      if (!lng || !lat || isNaN(lng) || isNaN(lat)) return;

      const numLng = parseFloat(lng);
      const numLat = parseFloat(lat);

      // Tạo marker element tùy chỉnh
      const el = document.createElement('div');
      el.className = 'goong-custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.background = '#ea580c';
      el.style.border = '2.5px solid #ffffff';
      el.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.45)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#ffffff';
      el.style.fontSize = '14px';
      el.style.cursor = 'pointer';
      el.innerHTML = '🍽️';

      const popupHtml = `
        <div style="font-family: inherit; padding: 4px; min-width: 140px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${item.name || 'Quán ăn'}</h4>
          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">${item.address || item.display_name || ''}</p>
        </div>
      `;
      const popup = new goongjs.Popup({ offset: 20 }).setHTML(popupHtml);

      const marker = new goongjs.Marker(el)
        .setLngLat([numLng, numLat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        if (onSelectMarker) onSelectMarker(item);
      });

      markersRef.current.push(marker);
      bounds.extend([numLng, numLat]);
      validCount++;
    });

    // Tự động zoom vừa vặn các marker nếu có từ 2 marker trở lên
    if (validCount > 1) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    } else if (validCount === 1) {
      const first = markers.find(m => (m.lng || m.lon) && m.lat);
      if (first) {
        map.flyTo({ center: [parseFloat(first.lng || first.lon), parseFloat(first.lat)], zoom: 15 });
      }
    }
  }, [markers, isMapLoaded]);

  // 4. Focus vào Marker khi người dùng bấm Ghim hoặc click thẻ
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || !activeMarkerName) return;

    const target = markers.find(m => m.name && m.name.toLowerCase() === activeMarkerName.toLowerCase());
    if (target) {
      const lng = target.lng || target.lon;
      const lat = target.lat;
      if (lng && lat) {
        map.flyTo({
          center: [parseFloat(lng), parseFloat(lat)],
          zoom: 16,
          essential: true
        });
      }
    }
  }, [activeMarkerName, markers, isMapLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%' }} 
      />
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(255, 255, 255, 0.92)',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#ea580c',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 10
      }}>
        <span>📍 Bản đồ Goong Maps VN</span>
      </div>
    </div>
  );
};

export default GoongMapView;
