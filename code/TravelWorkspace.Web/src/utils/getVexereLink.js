import transportLinks from '../transportLinks.json';

/**
 * Lấy link affiliate Vexere phù hợp theo dịch vụ hoặc địa điểm chuyến đi
 * @param {Object} svc - Object dịch vụ { title, desc, category }
 * @param {string} tripDestination - Tên điểm đến của chuyến đi (ví dụ: "Quảng Ninh", "Vịnh Hạ Long", "Sa Pa", ...)
 * @returns {string} URL affiliate Vexere rút gọn
 */
export const getVexereLink = (svc, tripDestination = '') => {
  if (svc && svc.affiliateUrl) {
    return svc.affiliateUrl;
  }

  const titleOrName = svc ? (svc.name || svc.title || '') : '';
  const descOrNotes = svc ? (svc.notes || svc.desc || '') : '';
  const itemDest = svc ? (svc.destination || '') : '';
  const itemRegion = svc ? (svc.region || '') : '';

  // 1. Khớp theo URL trực tiếp trong byServiceTitle
  if (titleOrName && transportLinks.byServiceTitle[titleOrName]) {
    return transportLinks.byServiceTitle[titleOrName];
  }

  // 2. Khớp theo region
  if (itemRegion && transportLinks.regions[itemRegion]) {
    return transportLinks.regions[itemRegion];
  }

  // 3. Khớp theo subDestinations trong destination / region / title
  const combinedText = `${titleOrName} ${descOrNotes} ${itemDest} ${itemRegion} ${tripDestination}`;
  for (const [sub, url] of Object.entries(transportLinks.subDestinations)) {
    if (combinedText.includes(sub)) return url;
  }
  for (const [reg, url] of Object.entries(transportLinks.regions)) {
    if (combinedText.includes(reg)) return url;
  }

  // 4. Mặc định trả về link Quảng Ninh
  return transportLinks.regions['Quảng Ninh'] || 'https://vexere.com';
};

export default getVexereLink;
