const https = require('https');

https.get('https://shorten.asia/JcA53PgX', (res) => {
    const loc = res.headers.location;
    console.log("Location:", loc);
    if (loc && loc.includes('url_enc=')) {
        const urlEnc = loc.split('url_enc=')[1].split('&')[0];
        const decoded = Buffer.from(urlEnc, 'base64').toString('utf-8');
        console.log("Decoded:", decoded);
        const dest = decoded.split('destination:')[1];
        const match = dest.match(/HOTEL\.\d+\.([^\.]+)\./);
        if (match && match[1]) {
            console.log("Hotel:", decodeURIComponent(match[1]).replace(/\+/g, ' '));
        } else {
            console.log("Regex didn't match.");
        }
    } else {
        console.log("No url_enc found.");
    }
});
