const fs = require('fs');
const file = 'src/pages/ItineraryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Mời thành viên button
content = content.replace(/<button[\s\S]*?setShowInviteModal\(true\)[\s\S]*?<\/button>/, '');

// 2, 3, 4. Move Template, Rename Add Activity, Plan B
const templateMatch = content.match(/<button[\s\S]*?setShowTemplateModal\(true\)[\s\S]*?<\/button>/);
if (templateMatch) {
    const templateBtn = templateMatch[0];
    content = content.replace(templateBtn, '');
    
    // Update Plan B
    content = content.replace(
      /<span>\{isPlanBActive \? '☔' : '🌧️'\}<\/span>\s*<span>\{isPlanBActive \? 'Đang bật Plan B \(Thời tiết xấu\)' : '🌧️ Kích hoạt Plan B \(Thời tiết xấu\)'\}<\/span>/g,
      `<span>{isPlanBActive ? 'Đang bật Kế hoạch B' : 'Kế hoạch B'}</span>`
    );

    // Update Add Activity and insert Template button
    content = content.replace(
      /<button className="btn-add-activity" onClick=\{\(\) => setShowAddForm\(true\)\}>\s*\+\s*Thêm Hoạt động\s*<\/button>/g,
      `<button className="btn-add-activity" onClick={() => setShowAddForm(true)} title="Thêm Hoạt động mới" style={{ padding: '8px', minWidth: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Plus size={20} strokeWidth={2.5} /></button>\n                      ` + templateBtn
    );
}

// 5. Passed item background color
content = content.replace(
  /<div key=\{item\.id\} className=\{\`timeline-item \$\{passed \? 'passed' : ''\}\`\}>/g,
  `<div key={item.id} className={\`timeline-item \$\{passed ? 'passed' : ''\}\`} style={passed ? { background: 'linear-gradient(to right, rgba(18, 43, 41, 0.08), rgba(210, 244, 125, 0.35))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(18, 43, 41, 0.15)' } : {}}>`
);

// 6. Generic Modal
content = content.replace(
  /const handleOpenFoodModal = \(item\) => \{/,
  `const handleOpenFoodModal = (item, category = 'food') => {`
);
content = content.replace(
  /setMapQuery\('restaurants'\);/,
  `setMapQuery(category === 'food' ? 'restaurants' : category === 'hotel' ? 'hotels' : 'transit station');`
);
content = content.replace(
  /activityItem: item,/,
  `activityItem: item,\n      category: category,`
);

// Buttons
content = content.replace(
  /<button\s*className="service-btn"\s*onClick=\{\(\) => setExploreData\(\{ isOpen: true, activity: \{ \.\.\.item, defaultCategory: 'Lưu trú', tripId: selectedTripId \} \}\)\}[\s\S]*?Tìm khách sạn\s*<\/button>/g,
  `<button className="service-btn" onClick={() => handleOpenFoodModal(item, 'hotel')} title="Tìm kiếm khách sạn & nơi lưu trú">
                                    <Building size={16} />
                                    Tìm khách sạn
                                  </button>`
);
content = content.replace(
  /<button\s*className="service-btn"\s*onClick=\{\(\) => setExploreData\(\{ isOpen: true, activity: \{ \.\.\.item, defaultCategory: 'Di chuyển', tripId: selectedTripId \} \}\)\}[\s\S]*?Gợi ý đối tác\s*<\/button>/g,
  `<button className="service-btn" onClick={() => handleOpenFoodModal(item, 'transport')} title="Tìm kiếm phương tiện di chuyển">
                                    <Bus size={16} />
                                    Di chuyển
                                  </button>`
);
content = content.replace(
  /<button\s*className="service-btn"\s*onClick=\{\(\) => handleOpenFoodModal\(item\)\}[\s\S]*?Khám phá ẩm thực\s*<\/button>/g,
  `<button className="service-btn" onClick={() => handleOpenFoodModal(item, 'food')} title="Khám phá ẩm thực & nhà hàng">
                                    <Utensils size={16} />
                                    Khám phá ẩm thực
                                  </button>`
);

// Modal title
content = content.replace(
  /<h3 className="food-map-modal-title">[\s\S]*?Quán ăn & Ẩm thực xung quanh/,
  `<h3 className="food-map-modal-title">\n                  {foodMapModal.category === 'hotel' ? <><Building size={20} style={{marginRight: 6}} /> Tìm khách sạn</> : foodMapModal.category === 'transport' ? <><Bus size={20} style={{marginRight: 6}} /> Di chuyển</> : <><Utensils size={20} style={{marginRight: 6}} /> Khám phá ẩm thực & nhà hàng</>}`
);

// Modal tabs
content = content.replace(
  /<button\s*className=\{\`food-map-tab \$\{activeFoodTab === 'real' \? 'active' : ''\}\`\}\s*onClick=\{\(\) => setActiveFoodTab\('real'\)\}\s*>\s*Nhà hàng thực tế/g,
  `<button className={\`food-map-tab \$\{activeFoodTab === 'real' ? 'active' : ''\}\`} onClick={() => setActiveFoodTab('real')}>
                      {foodMapModal.category === 'hotel' ? 'Khách sạn thực tế' : foodMapModal.category === 'transport' ? 'Phương tiện thực tế' : 'Nhà hàng thực tế'}`
);

// 7. Remove Map button
content = content.replace(
  /\{item\.location && \(\s*<button className="service-btn" onClick=\{\(\) => window\.open[\s\S]*?Bản đồ\s*<\/button>\s*\)\}/g, 
  ''
);

// 9. Remove Save button
content = content.replace(
  /\{passed \? \([\s\S]*?✅ Đã hoàn thành\s*<\/span>\s*\)\s*:\s*\([\s\S]*?Lưu' : 'Đã lưu'\}\s*<\/button>\s*\)\}/g,
  `{passed && (
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
                                    <span style={{marginRight: 4}}>✓</span> Đã hoàn thành
                                  </span>
                                )}`
);

// 10. Remove Emojis
content = content.replace(/✅/g, '✓');
content = content.replace(/💡/g, ''); 
content = content.replace(/☔/g, ''); 
content = content.replace(/🌧️/g, ''); 

// Also import CloudRain if needed
if (!content.includes('CloudRain')) {
    content = content.replace(/(import .*?lucide-react.*?;)/, (match) => {
        return match.replace('}', ', CloudRain}');
    });
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done script!');
