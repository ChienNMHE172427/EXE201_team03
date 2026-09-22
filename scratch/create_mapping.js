const fs = require('fs');
const data = JSON.parse(fs.readFileSync('output.json', 'utf-8'));

const mapping = {};
let currentLocation = '';
let currentPlatform = '';

for (const row of data) {
    if (row['Địa điểm du lịch cụ thể của địa điểm lớn']) {
        currentLocation = row['Địa điểm du lịch cụ thể của địa điểm lớn'].trim();
    }
    if (row['Link bên thứ 3']) {
        currentPlatform = row['Link bên thứ 3'].trim().toLowerCase();
    }
    
    if (currentLocation && currentPlatform && currentPlatform === 'traveloka') {
        const links = [];
        for (let i = 1; i <= 3; i++) {
            const key = `cư trú `;
            const val = row[key];
            if (val && val.includes(`Link ${i}:http`)) {
                links.push(val.split(`Link ${i}:`)[1].trim());
            }
        }
        if (links.length > 0) {
            if (!mapping[currentLocation]) mapping[currentLocation] = {};
            if (!mapping[currentLocation][currentPlatform]) mapping[currentLocation][currentPlatform] = [];
            mapping[currentLocation][currentPlatform].push(...links);
        }
    }
}

fs.writeFileSync('affiliateLinks.json', JSON.stringify(mapping, null, 2));
console.log('Mapping created!');
