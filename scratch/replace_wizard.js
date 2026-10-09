const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../code/TravelWorkspace.Web/src/pages');

const files = [
  'SharedGalleryPage.jsx',
  'ItineraryPage.jsx',
  'ExplorePage.jsx',
  'ExpensePage.jsx',
  'DocumentsPage.jsx',
  'CollaboratePage.jsx',
  'BudgetPage.jsx',
  'PackingPage.jsx',
  'CompanionsPage.jsx'
];

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // match <div className="wizard-steps-container">...</div>
  // we can use a regex that matches the opening div and everything until its closing div
  const regex = /<div className="wizard-steps-container">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
  
  // Wait, the inner structure is:
  // <div className="wizard-steps-container">
  //   <div className="wizard-steps">
  //     <div class="step">...</div>
  //     ...
  //   </div>
  // </div>
  // This is 3 levels deep. 
  
  // A safer regex since I know the exact structure:
  // Starts with <div className="wizard-steps-container">
  // Ends with </div>\s*</div>\s*</div> usually, but let's just find the index and count the brackets
  
  let changed = false;
  
  const startIndex = content.indexOf('<div className="wizard-steps-container">');
  if (startIndex !== -1) {
    let openDivs = 0;
    let endIndex = -1;
    
    // Simple parser to find the matching closing tag
    for (let i = startIndex; i < content.length; i++) {
      if (content.substr(i, 4) === '<div') openDivs++;
      if (content.substr(i, 6) === '</div>') {
        openDivs--;
        if (openDivs === 0) {
          endIndex = i + 6;
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      const tripIdVar = file === 'CompanionsPage.jsx' || file === 'PackingPage.jsx' || file === 'ExpensePage.jsx' || file === 'BudgetPage.jsx' ? 'selectedTripId' : 'selectedTripId'; // Need to check if they all use selectedTripId
      
      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex);
      
      content = before + `<TripNavigation selectedTripId={selectedTripId} />` + after;
      
      // Add import if not present
      if (!content.includes('TripNavigation')) {
        const importStatement = `import TripNavigation from '../components/TripNavigation';\n`;
        // insert after the last import
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfLastImport + 1) + importStatement + content.substring(endOfLastImport + 1);
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
