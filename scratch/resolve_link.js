const https = require('https');

function resolveRedirect(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                resolve(res.headers.location);
            } else {
                resolve(url); // No redirect
            }
        }).on('error', reject);
    });
}

async function test() {
    try {
        let currentUrl = 'https://shorten.asia/JcA53PgX';
        console.log('Original:', currentUrl);
        
        for (let i = 0; i < 5; i++) {
            const nextUrl = await resolveRedirect(currentUrl);
            console.log('Redirected to:', nextUrl);
            if (nextUrl === currentUrl || !nextUrl.startsWith('http')) {
                break;
            }
            currentUrl = nextUrl;
            if (currentUrl.includes('traveloka.com')) break;
        }
    } catch (e) {
        console.error(e);
    }
}

test();
