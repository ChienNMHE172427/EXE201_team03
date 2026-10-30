// Ảnh phong cảnh chuẩn xác theo danh lam thắng cảnh Việt Nam
export const DESTINATION_IMAGES = {
  'hà giang': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop', // Đèo Mã Pì Lèng
  'ha giang': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop',
  'sapa': 'https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop',     // Ruộng bậc thang & Núi Sapa
  'sa pa': 'https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop',
  'đà nẵng': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',  // Bà Nà Hills & Cầu Vàng
  'da nang': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
  'hội an': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  'hoi an': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  'ninh bình': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80', // Tràng An Ninh Bình
  'ninh binh': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80',
  'hạ long': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'ha long': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'phú quốc': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
  'phu quoc': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
  'đà lạt': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'da lat': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'default': 'https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop'
};

export const getDestinationImage = (destination, title, dbImageUrl) => {
  if (dbImageUrl && dbImageUrl.trim()) return dbImageUrl;
  const text = `${destination || ''} ${title || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key !== 'default' && text.includes(key)) {
      return url;
    }
  }
  return DESTINATION_IMAGES.default;
};

// Loại bỏ dấu tiếng Việt để so sánh tìm kiếm
export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Làm sạch và trích xuất địa danh cốt lõi (loại bỏ từ hành chính xã, huyện, tỉnh, đảo, v.v.)
export const cleanDestinationKeyword = (str) => {
  if (!str) return '';
  let s = removeVietnameseTones(str);
  s = s.replace(/\b(xa|phuong|thi tran|huyen|thi xa|thanh pho|tp|tinh|dao|vinh|quan dao|quan the|khu du lich|chuyen di|kham pha|tham quan|du lich|tour)\b/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
};

// Kiểm tra xem 2 địa danh hoặc chuỗi có cùng điểm đến không (chính xác theo địa danh, không match bừa)
export const matchDestination = (targetLocation, templateLocation, templateTitle = '') => {
  if (!targetLocation || !targetLocation.trim()) return false;
  
  const cleanTarget = cleanDestinationKeyword(targetLocation);
  if (!cleanTarget) return false;

  const cleanTemplate = cleanDestinationKeyword(templateLocation);
  const cleanTitle = cleanDestinationKeyword(templateTitle);

  // 1. So khớp trực tiếp chuỗi địa danh cốt lõi (ví dụ: 'co to' trong 'dao co to', hoặc ngược lại)
  if (cleanTemplate && (cleanTemplate.includes(cleanTarget) || cleanTarget.includes(cleanTemplate))) {
    return true;
  }
  if (cleanTitle && cleanTitle.includes(cleanTarget)) {
    return true;
  }

  // 2. Tách từ khóa địa danh có nghĩa theo từng cụm (từ 2 từ trở lên: ví dụ 'co to', 'ha giang', 'sa pa')
  const targetTokens = cleanTarget.split(/[\s,]+/).filter(w => w.length >= 2 && !['viet', 'nam'].includes(w));
  if (targetTokens.length >= 2) {
    const fullPhrase = targetTokens.join(' ');
    if ((cleanTemplate && cleanTemplate.includes(fullPhrase)) || (cleanTitle && cleanTitle.includes(fullPhrase))) {
      return true;
    }
  }

  // 3. Nếu địa danh của target có phân đoạn dấu phẩy (ví dụ: "Xã Cô Tô, Huyện Cô Tô, Tỉnh Quảng Ninh")
  const parts = targetLocation.split(',').map(p => cleanDestinationKeyword(p)).filter(Boolean);
  for (const part of parts) {
    if (part.length >= 3) {
      if ((cleanTemplate && (cleanTemplate.includes(part) || part.includes(cleanTemplate))) ||
          (cleanTitle && cleanTitle.includes(part))) {
        return true;
      }
    }
  }

  return false;
};
