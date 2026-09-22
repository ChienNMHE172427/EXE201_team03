export const getShortLocation = (locationName) => {
  if (!locationName) return '';
  return locationName.split(',')[0].trim();
};

export const formatItemTitle = (title) => {
  if (!title) return '';
  
  // 1. Từ A đi B (Dành cho tiêu đề chuyến đi)
  if (title.toLowerCase().startsWith('từ ')) {
    let parts = title.split(' đi ');
    if (parts.length === 2) {
      let prefixMatch = title.match(/^từ /i);
      let prefix = prefixMatch ? prefixMatch[0] : 'Từ ';
      let originPart = parts[0].substring(prefix.length);
      let destPart = parts[1];
      let shortOrigin = originPart.split(',')[0].trim();
      let shortDest = destPart.split(',')[0].trim();
      return `${prefix}${shortOrigin} đi ${shortDest}`;
    }
  }

  // 2. Khởi hành từ A đi B
  if (title.toLowerCase().startsWith('khởi hành từ')) {
    let parts = title.split(' đi ');
    if (parts.length === 2) {
      // Find the actual prefix case to keep it
      let prefixMatch = title.match(/^khởi hành từ /i);
      let prefix = prefixMatch ? prefixMatch[0] : 'Khởi hành từ ';
      let originPart = parts[0].substring(prefix.length);
      let destPart = parts[1];
      let shortOrigin = originPart.split(',')[0].trim();
      let shortDest = destPart.split(',')[0].trim();
      return `${prefix}${shortOrigin} đi ${shortDest}`;
    }
  }

  // 2. Đến A, nhận phòng & nghỉ ngơi
  if (title.toLowerCase().startsWith('đến') && title.toLowerCase().includes('nhận phòng')) {
    let parts = title.split(/,?\s*nhận phòng/i);
    if (parts.length >= 2) {
      let prefixMatch = title.match(/^đến /i);
      let prefix = prefixMatch ? prefixMatch[0] : 'Đến ';
      let destPart = parts[0].substring(prefix.length);
      let shortDest = destPart.split(',')[0].trim();
      
      // Reconstruct the rest
      let suffixIndex = title.toLowerCase().indexOf('nhận phòng');
      let suffix = title.substring(suffixIndex);
      return `${prefix}${shortDest}, ${suffix}`;
    }
  }

  return title;
};
