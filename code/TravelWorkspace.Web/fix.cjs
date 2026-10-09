const fs = require('fs');
const file = 'src/pages/ItineraryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Restore TripNavigation
if (!content.includes('import TripNavigation')) {
    content = content.replace(/(import .*?;)/, `$1\nimport TripNavigation from '../components/TripNavigation';`);
}
const wizardRegex = /<div className="wizard-steps-container">[\s\S]*?<div className="step-title">Cộng tác nhóm<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(wizardRegex, '<TripNavigation selectedTripId={selectedTripId} />');
content = content.replace(/className="service-btn map-btn"/g, 'className="service-btn"');

// Now, the new changes from the user!
// 1. Bỏ nút mời thành viên & 2. Chuyển nút template xuống
const headerRegex = /<div className="page-header" style=\{\{ marginBottom: 24 \}\}>[\s\S]*?<\/div>\s*<\/div>/;
const headerMatch = content.match(headerRegex);

if (headerMatch) {
    const templateMatch = headerMatch[0].match(/<button[\s\S]*?setShowTemplateModal\(true\)[\s\S]*?<\/button>/);
    const templateBtn = templateMatch ? templateMatch[0] : '';
    
    // Remove entire page-header since it only contains Title + (Template + Mời thành viên)
    // Wait, it contains Title (Chuyến đi Hà Nội...) which is needed!
    // Let's just remove the buttons wrapper.
    content = content.replace(/<div style=\{\{ display: 'flex', gap: '12px' \}\}>[\s\S]*?<\/div>\s*<\/div>/, '</div>');
    
    // 3 & 4. Insert TemplateBtn next to Thêm hoạt động, replace text with Plus icon, rename Kế hoạch B
    const rightControlsRegex = /<div className="timeline-date-right">([\s\S]*?)<\/div>\s*<\/div>\s*<div className="timeline-list">/g;
    
    content = content.replace(rightControlsRegex, (match, inner) => {
        let newInner = inner;
        // plan B
        newInner = newInner.replace(/<span>\{isPlanBActive \? '☔' : '🌧️'\}<\/span>/, '<span style={{marginRight: 4}}><CloudRain size={16}/></span>');
        newInner = newInner.replace(/\{isPlanBActive \? 'Đang bật Plan B \(Thời tiết xấu\)' : '🌧️ Kích hoạt Plan B \(Thời tiết xấu\)'\}/, "{isPlanBActive ? 'Đang bật Kế hoạch B' : 'Kế hoạch B'}");
        
        // add activity
        newInner = newInner.replace(
            /<button className="btn-add-activity" onClick=\{\(\) => setShowAddForm\(true\)\}>\s*\+\s*Thêm Hoạt động\s*<\/button>/,
            `<button className="btn-add-activity" onClick={() => setShowAddForm(true)} title="Thêm Hoạt động mới" style={{ padding: '8px', minWidth: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Plus size={20} strokeWidth={2.5} /></button>\n                      ${templateBtn}`
        );
        return `<div className="timeline-date-right">${newInner}</div></div><div className="timeline-list">`;
    });
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

// Check if CloudRain is imported
if (!content.includes('CloudRain')) {
    content = content.replace(/(import .*?lucide-react.*?;)/, (match) => {
        return match.replace('}', ', CloudRain}');
    });
}

fs.writeFileSync(file, content, 'utf8');
console.log('Script completed');
