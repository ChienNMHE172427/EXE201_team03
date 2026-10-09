const fs = require('fs');
const file = 'src/pages/ItineraryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for savedServices
content = content.replace(
  'const [foodModalToast, setFoodModalToast] = useState(null);',
  'const [foodModalToast, setFoodModalToast] = useState(null);\n  const [savedServices, setSavedServices] = useState({});'
);

// 2. Modify handleAddRestaurantToItinerary
const handleAddReplace = `
    try {
      if (foodMapModal.activityItem && foodMapModal.activityItem.id) {
        setSavedServices(prev => ({
          ...prev,
          [foodMapModal.activityItem.id]: {
            ...(prev[foodMapModal.activityItem.id] || {}),
            [foodMapModal.category]: { ...placeItem, source }
          }
        }));
      } else {
        const payload = {
          date: foodMapModal.activityItem?.startTime || trip?.startDate || new Date().toISOString(),
          restaurantName: placeName,
          address: placeAddress,
          specialty: placeSpecialty,
          notes: placeNotes,
          lat: placeItem.lat ? String(placeItem.lat) : null,
          lon: placeItem.lon ? String(placeItem.lon) : null
        };
        await api.post(\`/Itinerary/\${selectedTripId}/add-restaurant\`, payload);
      }

      setAddedRestaurants(prev => ({ ...prev, [itemKey]: true }));
      setFoodModalToast(\`Đã lưu "\${placeName}" vào hoạt động này!\`);
      
      // Chuyển sang chế độ xem locked mode
      setFoodMapModal(prev => ({ ...prev, isLocked: true }));
      
      setTimeout(() => setFoodModalToast(null), 3500);
`;
content = content.replace(/try\s*\{\s*const payload = \{[\s\S]*?setTimeout\(\(\) => setFoodModalToast\(null\), 3500\);/g, handleAddReplace);


// 3. Split the modal body correctly.
// Instead of complex regex replacing the entire end of the file, we inject `{isLocked ? <Locked/> : <>` 
// and `</>}` carefully.
const modalBodyStartRegex = /\{\/\* Split Layout Body \*\/\}\s*<div className="food-map-split-body">/;
const lockedViewJSX = `
            {/* Split Layout Body */}
            {foodMapModal.isLocked && savedServices[foodMapModal.activityItem?.id]?.[foodMapModal.category] ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', flex: 1 }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ display: 'inline-block', background: '#d2f47d', color: '#122B29', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                        ĐÃ LƯU VÀO LỊCH TRÌNH
                      </span>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>
                        {savedServices[foodMapModal.activityItem.id][foodMapModal.category].name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name?.split(',')[0]}
                      </h4>
                      <p style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} />
                        {savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].address || foodMapModal.query}
                      </p>
                      
                      {savedServices[foodMapModal.activityItem.id][foodMapModal.category].reason && (
                        <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#334155', borderLeft: '3px solid #0284c7' }}>
                          <strong>AI Đánh giá:</strong> {savedServices[foodMapModal.activityItem.id][foodMapModal.category].reason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <a
                      href={\`https://www.google.com/maps/dir/?api=1&destination=\${encodeURIComponent(savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].name)}\`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-food-action"
                    >
                      <Compass size={16} /> Chỉ đường
                    </a>
                    <button 
                      className="btn-food-action"
                      onClick={() => setFoodMapModal(prev => ({ ...prev, isLocked: false }))}
                      style={{ marginLeft: 'auto' }}
                    >
                      <RefreshCw size={16} /> Thay đổi lựa chọn
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="food-map-split-body">
`;
content = content.replace(modalBodyStartRegex, lockedViewJSX);

// Find the footer div exact end
content = content.replace(
  /Mở Google Maps lớn ↗\n\s*<\/a>\n\s*<\/div>/,
  'Mở Google Maps lớn ↗\n              </a>\n            </div>\n            </>\n            )}'
);

// 4. Update the service buttons in the main view
content = content.replace(
  /onClick=\{\(\) => handleOpenServiceModal\(item, 'food'\)\}/g,
  'className={savedServices[item.id]?.food ? "service-btn-saved" : ""} style={savedServices[item.id]?.food ? { background: "#d2f47d", color: "#122B29", borderColor: "#d2f47d" } : undefined} onClick={() => { handleOpenServiceModal(item, "food"); if (savedServices[item.id]?.food) setFoodMapModal(prev => ({...prev, isLocked: true})); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleOpenServiceModal\(item, 'hotel'\)\}/g,
  'className={savedServices[item.id]?.hotel ? "service-btn-saved" : ""} style={savedServices[item.id]?.hotel ? { background: "#d2f47d", color: "#122B29", borderColor: "#d2f47d" } : undefined} onClick={() => { handleOpenServiceModal(item, "hotel"); if (savedServices[item.id]?.hotel) setFoodMapModal(prev => ({...prev, isLocked: true})); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleOpenServiceModal\(item, 'transport'\)\}/g,
  'className={savedServices[item.id]?.transport ? "service-btn-saved" : ""} style={savedServices[item.id]?.transport ? { background: "#d2f47d", color: "#122B29", borderColor: "#d2f47d" } : undefined} onClick={() => { handleOpenServiceModal(item, "transport"); if (savedServices[item.id]?.transport) setFoodMapModal(prev => ({...prev, isLocked: true})); }}'
);


fs.writeFileSync(file, content, 'utf8');
console.log('Success!');
