const fs = require('fs');
const file = 'src/pages/ItineraryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Title headers
content = content.replace('Khách sạn & Lưu trú xung quanh', '<Building size={20} style={{marginRight: 6}} /> Khách sạn & Lưu trú xung quanh');
content = content.replace('Di chuyển & Trạm tàu xe', '<Bus size={20} style={{marginRight: 6}} /> Di chuyển & Trạm tàu xe');
content = content.replace('Quán ăn & Ẩm thực xung quanh', '<Utensils size={20} style={{marginRight: 6}} /> Quán ăn & Ẩm thực xung quanh');

// Tags / Chips
content = content.replace('Khách sạn<', '<Building size={14} style={{marginRight: 4}} /> Khách sạn<');
content = content.replace('Homestay<', '<Building size={14} style={{marginRight: 4}} /> Homestay<');
content = content.replace('Resort<', '<Building size={14} style={{marginRight: 4}} /> Resort<');
content = content.replace('Nhà hàng<', '<Utensils size={14} style={{marginRight: 4}} /> Nhà hàng<');
content = content.replace('Cafe<', '<Coffee size={14} style={{marginRight: 4}} /> Cafe<');
content = content.replace('Quán nhậu<', '<Utensils size={14} style={{marginRight: 4}} /> Quán nhậu<');

// Action buttons
content = content.replace(/'Thêm vào lịch trình'/g, '<><Plus size={14} /> Thêm vào lịch trình</>');
content = content.replace(/>Ghim bản đồ</g, '><Map size={14} /> Ghim bản đồ<');
content = content.replace(/>Chỉ đường</g, '><Compass size={14} /> Chỉ đường<');

// Address and details
content = content.replace('Địa điểm thực<', '<MapPin size={12} style={{marginRight: 4}} /> Địa điểm thực<');
content = content.replace(/>Dữ liệu địa điểm/g, '><Map size={14} style={{marginRight: 6}} /> Dữ liệu địa điểm');

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
