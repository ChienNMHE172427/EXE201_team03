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

// Kiểm tra xem 2 địa danh hoặc chuỗi có liên quan nhau không
export const matchDestination = (targetLocation, templateLocation, templateTitle = '') => {
  if (!targetLocation) return false;
  const cleanTarget = removeVietnameseTones(targetLocation);
  const cleanTemplate = removeVietnameseTones(templateLocation);
  const cleanTitle = removeVietnameseTones(templateTitle);

  // Tách từ khóa quan trọng từ targetLocation
  const targetWords = cleanTarget
    .split(/[\s,]+/)
    .filter(w => w.length > 1 && !['viet', 'nam', 'tp', 'thanh', 'pho', 'tinh'].includes(w));

  // Kiểm tra chứa trực tiếp
  if (cleanTemplate.includes(cleanTarget) || cleanTarget.includes(cleanTemplate)) return true;
  if (cleanTitle.includes(cleanTarget)) return true;

  // Kiểm tra các từ khóa chính
  for (const word of targetWords) {
    if (word.length >= 3 && (cleanTemplate.includes(word) || cleanTitle.includes(word))) {
      return true;
    }
  }

  return false;
};
