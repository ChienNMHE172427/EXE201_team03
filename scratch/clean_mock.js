const fs = require('fs');

const servicesPath = 'C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\servicesData.json';
const services = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
const hotelLinks = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\hotelLinks.json', 'utf-8'));

// Filter out "Lưu trú" services that DO NOT exist in hotelLinks
const filteredServices = services.filter(svc => {
    if (svc.category === 'Lưu trú') {
        // If it's a "Lưu trú" service, only keep it if we have a real affiliate link for it
        return hotelLinks[svc.title] !== undefined;
    }
    return true; // keep other categories
});

fs.writeFileSync(servicesPath, JSON.stringify(filteredServices, null, 2));
console.log(`Cleaned up mock data. Kept ${filteredServices.length} items out of ${services.length}`);
