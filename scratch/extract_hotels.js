const fs = require('fs');
const https = require('https');

const linksData = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\code\\TravelWorkspace.Web\\src\\affiliateLinks.json', 'utf-8'));

function resolveRedirect(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                resolve(res.headers.location);
            } else {
                resolve(url);
            }
        }).on('error', reject);
    });
}

async function extractHotelName(shortUrl) {
    try {
        const redirected = await resolveRedirect(shortUrl);
        if (redirected && redirected.includes('url_enc=')) {
            const urlEncRaw = redirected.split('url_enc=')[1].split('&')[0];
            const urlEnc = decodeURIComponent(urlEncRaw);
            const decoded = Buffer.from(urlEnc, 'base64').toString('utf-8');
            
            // Check if it's the direct URL or has destination:
            let dest = decoded;
            if (decoded.includes('destination:')) {
                dest = decoded.split('destination:')[1];
            }
            
            const match = dest.match(/HOTEL\.\d+\.([^\.]+)\./);
            if (match && match[1]) {
                return decodeURIComponent(match[1]).replace(/\+/g, ' ');
            }
            if (dest.includes('/hotel/vietnam/')) {
                let slug = dest.split('/hotel/vietnam/')[1].split('?')[0].split('-').slice(0, -1).join(' ');
                return slug;
            }
        }
        return "Unknown";
    } catch (e) {
        return "Error";
    }
}

async function main() {
    const result = {};
    for (const [location, platforms] of Object.entries(linksData)) {
        if (platforms.traveloka) {
            for (const link of platforms.traveloka) {
                const name = await extractHotelName(link);
                console.log(`[${location}] ${link} -> ${name}`);
                result[link] = name;
            }
        }
    }
    fs.writeFileSync('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\scratch\\extracted_hotels.json', JSON.stringify(result, null, 2));
    console.log('Done!');
}

main();
