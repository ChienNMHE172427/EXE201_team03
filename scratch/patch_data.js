const fs = require('fs');

const linksData = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\affiliateLinks.json', 'utf-8'));
const extracted = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\scratch\\extracted_hotels.json', 'utf-8'));
const servicesPath = 'C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\servicesData.json';
const services = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));

let nextId = Math.max(...services.map(s => s.id)) + 1;
const newHotelLinks = {};

for (const [location, platforms] of Object.entries(linksData)) {
    if (platforms.traveloka) {
        for (const link of platforms.traveloka) {
            const hotelName = extracted[link];
            if (hotelName && hotelName !== "Unknown" && hotelName !== "Error") {
                newHotelLinks[hotelName] = link;
                
                // Add to servicesData.json if it doesn't exist
                const exists = services.find(s => s.title.toLowerCase() === hotelName.toLowerCase());
                if (!exists) {
                    services.push({
                        id: nextId++,
                        type: "LƯU TRÚ",
                        category: "Lưu trú",
                        title: hotelName,
                        rating: 4.8,
                        reviews: Math.floor(Math.random() * 200) + 50,
                        price: "$",
                        desc: `Lưu trú tại ${location}`,
                        badge: "Đề cử",
                        imgClass: "i3"
                    });
                }
            }
        }
    }
}

fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2));
fs.writeFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\hotelLinks.json', JSON.stringify(newHotelLinks, null, 2));
console.log('Data patched successfully!');
