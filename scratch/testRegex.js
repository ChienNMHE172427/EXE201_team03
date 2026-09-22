const formatItemTitle = (title) => {
  if (!title) return '';
  
  // 1. Khởi hành từ A đi B
  if (title.toLowerCase().startsWith('khởi hành từ')) {
    let parts = title.split(' đi ');
    if (parts.length === 2) {
      let originPart = parts[0].replace('Khởi hành từ ', '').replace('khởi hành từ ', '');
      let destPart = parts[1];
      let shortOrigin = originPart.split(',')[0].trim();
      let shortDest = destPart.split(',')[0].trim();
      return `Khởi hành từ ${shortOrigin} đi ${shortDest}`;
    }
  }

  // 2. Đến A, nhận phòng & nghỉ ngơi
  if (title.toLowerCase().startsWith('đến') && title.toLowerCase().includes('nhận phòng')) {
    let parts = title.split(', nhận phòng');
    if (parts.length === 2) {
      let destPart = parts[0].replace('Đến ', '').replace('đến ', '');
      let shortDest = destPart.split(',')[0].trim();
      return `Đến ${shortDest}, nhận phòng${parts[1]}`;
    }
  }

  return title;
};

const titles = [
  "Khởi hành từ Hà Nội, Việt Nam đi Đảo Cô Tô, Đặc khu Cô Tô, Thành phố Quảng Ninh, Việt Nam",
  "Đến Đảo Cô Tô, Đặc khu Cô Tô, Thành phố Quảng Ninh, Việt Nam, nhận phòng & nghỉ ngơi"
];

titles.forEach(t => console.log(formatItemTitle(t)));
