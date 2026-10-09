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
      
      // Khóa modal sau khi thêm
      setFoodMapModal(prev => ({ ...prev, isLocked: true }));
      
      setTimeout(() => setFoodModalToast(null), 3500);
`;
content = content.replace(/try\s*\{\s*const payload = \{[\s\S]*?setTimeout\(\(\) => setFoodModalToast\(null\), 3500\);/g, handleAddReplace);


// 3. Instead of wrapping the body, wrap the ENTIRE MODAL.
// Find `{foodMapModal.isOpen && (` and replace with locked view logic.
const modalOpenStartRegex = /\{foodMapModal\.isOpen && \(\s*<div className="food-map-modal-overlay"/;
const lockedModalJSX = `
      {foodMapModal.isOpen && foodMapModal.isLocked && savedServices[foodMapModal.activityItem?.id]?.[foodMapModal.category] ? (
        <div className="food-map-modal-overlay" onClick={handleCloseFoodModal} style={{ zIndex: 9999 }}>
          <div className="food-map-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', minHeight: '300px' }}>
            <div className="food-map-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="food-map-modal-title">
                <h3>{foodMapModal.category === 'hotel' ? <><Building size={20} style={{marginRight: 6}} /> Khách sạn đã lưu</> : foodMapModal.category === 'transport' ? <><Bus size={20} style={{marginRight: 6}} /> Phương tiện đã lưu</> : <><Utensils size={20} style={{marginRight: 6}} /> Quán ăn đã lưu</>}</h3>
              </div>
              <button type="button" className="food-map-modal-close" onClick={handleCloseFoodModal} title="Đóng (Esc)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ padding: '32px 24px', background: '#f8fafc' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'inline-block', background: '#d2f47d', color: '#122B29', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
                  ✓ ĐÃ LƯU VÀO LỊCH TRÌNH
                </span>
                
                <h4 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#0f172a' }}>
                  {savedServices[foodMapModal.activityItem.id][foodMapModal.category].name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name?.split(',')[0]}
                </h4>
                
                <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} />
                  {savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].address || foodMapModal.query}
                </p>
                
                {savedServices[foodMapModal.activityItem.id][foodMapModal.category].reason && (
                  <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', fontSize: '14px', color: '#334155', borderLeft: '4px solid #0284c7', marginBottom: '16px' }}>
                    <strong>Đánh giá:</strong> {savedServices[foodMapModal.activityItem.id][foodMapModal.category].reason}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                  <a
                    href={\`https://www.google.com/maps/dir/?api=1&destination=\${encodeURIComponent(savedServices[foodMapModal.activityItem.id][foodMapModal.category].display_name || savedServices[foodMapModal.activityItem.id][foodMapModal.category].name)}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-food-action"
                    style={{ flex: 1, justifyContent: 'center', background: '#122b29', color: 'white', borderColor: '#122b29' }}
                  >
                    <Compass size={16} /> Chỉ đường Google Maps
                  </a>
                  <button 
                    className="btn-food-action"
                    onClick={() => setFoodMapModal(prev => ({ ...prev, isLocked: false }))}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <RefreshCw size={16} /> Thay đổi lựa chọn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : foodMapModal.isOpen ? (
        <div className="food-map-modal-overlay"
`;

content = content.replace(modalOpenStartRegex, lockedModalJSX);
// Note: we need to replace `)}` at the end of modal with ` : null}` but since the original was `{foodMapModal.isOpen && ( ... )}`, replacing the `(` with ` ? ( ... ) : foodMapModal.isOpen ? (` means the end `)}` will correctly close the nested ternary as `: null}` is not needed, wait.
// Wait, `{condition ? A : condition2 ? B : null}`
// Original was `{foodMapModal.isOpen && ( <div... /> )}`
// If I replace `{foodMapModal.isOpen && ( <div` with `{locked ? <Locked/> : foodMapModal.isOpen ? ( <div`,
// then at the very end, there is `)}`. That closing `)}` will close the `foodMapModal.isOpen ? ( <div... /> )}`
// But wait, ternary needs a false branch. `foodMapModal.isOpen ? ( ... ) : null}`
// Original: `{foodMapModal.isOpen && ( ... )}` - this is a logical AND.
// If I change it to `{locked ? <Locked/> : foodMapModal.isOpen && ( <div...` it will perfectly match!
// Let's change the replacement string to use `&&` for the fallback!
const fixedLockedModalJSX = lockedModalJSX.replace(') : foodMapModal.isOpen ? (', ') : foodMapModal.isOpen && (');
content = content.replace(modalOpenStartRegex, fixedLockedModalJSX);

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
console.log('Patch complete!');
