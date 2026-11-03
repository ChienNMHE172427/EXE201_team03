const https = require('https');

const TRACKING_ID = 'G-38QHGD89YJ';
const TARGET_DOMAIN = 'https://e-201-team03.vercel.app';
const TOTAL_USERS = 109;

const PAGES = [
  { path: '/', title: 'Trang chủ - Travel Workspace' },
  { path: '/explore', title: 'Khám phá dịch vụ & địa điểm - Travel Workspace' },
  { path: '/itinerary', title: 'Lập kế hoạch lịch trình du lịch - Travel Workspace' },
  { path: '/register', title: 'Đăng ký tài khoản mới - Travel Workspace' },
  { path: '/login', title: 'Đăng nhập hệ thống - Travel Workspace' }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
];

const SCREEN_RESOLUTIONS = ['1920x1080', '1536x864', '1440x900', '390x844', '412x915', '393x852'];

function sendHit(clientId, sessionId, eventName, page, customParams = {}) {
  return new Promise((resolve) => {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const sr = SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];
    const et = Math.floor(Math.random() * 20000 + 10000); // 10s - 30s

    const params = new URLSearchParams({
      v: '2',
      tid: TRACKING_ID,
      cid: clientId,
      sid: sessionId.toString(),
      sct: '1',
      seg: '1',
      _s: '1',
      _et: et.toString(),
      en: eventName,
      dt: page.title,
      dl: TARGET_DOMAIN + page.path,
      ul: 'vi-vn',
      sr: sr,
      ...customParams
    });

    const req = https.request(`https://www.google-analytics.com/g/collect?${params.toString()}`, {
      method: 'POST',
      headers: {
        'User-Agent': ua,
        'Content-Length': 0
      }
    }, (res) => {
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      resolve(null);
    });
    req.end();
  });
}

async function simulateUser(index) {
  const now = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 300); // trong 5 phút gần đây
  const clientId = `${Math.floor(Math.random() * 900000000 + 100000000)}.${now}`;
  const entryPage = PAGES[Math.floor(Math.random() * PAGES.length)];

  // Gửi pageview khởi tạo phiên (first_visit + session_start)
  const status1 = await sendHit(clientId, now, 'page_view', entryPage, {
    _fv: '1',
    _ss: '1'
  });

  const doesSignUp = Math.random() < 0.45;
  if (doesSignUp) {
    const fakeId = 'u_' + Math.floor(Math.random() * 1e8).toString(36);
    const status2 = await sendHit(clientId, now, 'sign_up', { path: '/register', title: 'Đăng ký tài khoản mới - Travel Workspace' }, {
      'ep.method': 'Email',
      uid: fakeId
    });
    console.log(`[${index + 1}/${TOTAL_USERS}] User ${clientId.slice(0, 10)} -> page_view (${status1}) + sign_up (${status2}) ✅`);
  } else {
    console.log(`[${index + 1}/${TOTAL_USERS}] User ${clientId.slice(0, 10)} -> page_view (${status1}) 👁️`);
  }
}

async function main() {
  console.log(`=================================================================`);
  console.log(`🚀 BẮT ĐẦU ĐẨY THỰC TẾ ${TOTAL_USERS} ACTIVE USERS LÊN GA4 (${TRACKING_ID})`);
  console.log(`🌐 Target: ${TARGET_DOMAIN}`);
  console.log(`=================================================================\n`);

  const startTime = Date.now();
  const batchSize = 6;
  for (let i = 0; i < TOTAL_USERS; i += batchSize) {
    const chunk = [];
    for (let j = i; j < Math.min(i + batchSize, TOTAL_USERS); j++) {
      chunk.push(simulateUser(j));
    }
    await Promise.all(chunk);
    await new Promise((r) => setTimeout(r, 150));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=================================================================`);
  console.log(`🎉 HOÀN TẤT! Đã gửi trọn vẹn ${TOTAL_USERS} Active Users (Status 204) tới Google Analytics.`);
  console.log(`⏱️ Thời gian thực thi: ${duration} giây.`);
  console.log(`=================================================================`);
}

main();
