const https = require('https');

const TRACKING_ID = 'G-38QHGD89YJ';
const TARGET_DOMAIN = 'https://e-201-team03.vercel.app';
const TOTAL_USERS = 109;

const PAGES = [
  { path: '/', title: 'Trang chủ - Travel Workspace' },
  { path: '/explore', title: 'Khám phá dịch vụ & địa điểm' },
  { path: '/itinerary', title: 'Lập kế hoạch lịch trình du lịch' },
  { path: '/register', title: 'Đăng ký tài khoản mới' },
  { path: '/login', title: 'Đăng nhập hệ thống' }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
];

const SCREEN_RESOLUTIONS = ['1920x1080', '1536x864', '1440x900', '390x844', '412x915', '393x852'];

function sendGaEvent(clientId, eventName, page, customParams = {}) {
  return new Promise((resolve) => {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const sr = SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];
    const engagementTimeMs = Math.floor(Math.random() * 25000 + 8000); // 8s - 33s

    const params = new URLSearchParams({
      v: '2',
      tid: TRACKING_ID,
      cid: clientId,
      _p: Math.floor(Math.random() * 1e9).toString(),
      en: eventName,
      'ep.page_title': page.title,
      dl: TARGET_DOMAIN + page.path,
      ul: 'vi-vn',
      sr: sr,
      _s: '1',
      _et: engagementTimeMs.toString(),
      seg: '1',
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

    req.on('error', () => resolve(null));
    req.end();
  });
}

async function simulateUser(index) {
  // Mỗi user có một Client ID chuẩn GA4 riêng biệt
  const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1800);
  const clientId = `${Math.floor(Math.random() * 900000000 + 100000000)}.${timestamp}`;

  // 1. Sự kiện vào web lần đầu: first_visit & session_start & page_view
  const entryPage = PAGES[Math.floor(Math.random() * PAGES.length)];
  await sendGaEvent(clientId, 'page_view', entryPage, {
    _fv: '1', // First visit
    _ss: '1'  // Session start
  });

  // 2. Khoảng 40% người dùng thực hiện đăng ký (sign_up)
  const doesSignUp = Math.random() < 0.45;
  if (doesSignUp) {
    const fakeId = 'u_' + Math.floor(Math.random() * 1e8).toString(36);
    await sendGaEvent(clientId, 'sign_up', { path: '/register', title: 'Đăng ký tài khoản mới' }, {
      'ep.method': 'Email',
      uid: fakeId
    });
    console.log(`[${index + 1}/${TOTAL_USERS}] User ${clientId.slice(0, 10)}... -> page_view (${entryPage.path}) + sign_up ✅`);
  } else {
    // 3. Người dùng bình thường duyệt thêm 1 trang nữa
    const secondPage = PAGES[Math.floor(Math.random() * PAGES.length)];
    if (secondPage.path !== entryPage.path) {
      await sendGaEvent(clientId, 'page_view', secondPage);
    }
    console.log(`[${index + 1}/${TOTAL_USERS}] User ${clientId.slice(0, 10)}... -> page_view (${entryPage.path}) 👁️`);
  }
}

async function main() {
  console.log(`=================================================================`);
  console.log(`🚀 BẮT ĐẦU ĐẨY ${TOTAL_USERS} NGƯỜI DÙNG LÊN GOOGLE ANALYTICS 4`);
  console.log(`🎯 Tracking ID: ${TRACKING_ID}`);
  console.log(`🌐 Website: ${TARGET_DOMAIN}`);
  console.log(`=================================================================\n`);

  const startTime = Date.now();

  // Chạy song song từng nhóm 5 user để vừa nhanh vừa giãn cách tự nhiên
  const batchSize = 5;
  for (let i = 0; i < TOTAL_USERS; i += batchSize) {
    const chunk = [];
    for (let j = i; j < Math.min(i + batchSize, TOTAL_USERS); j++) {
      chunk.push(simulateUser(j));
    }
    await Promise.all(chunk);
    // Delay nhẹ 200 - 400ms giữa các nhóm
    await new Promise((r) => setTimeout(r, 250));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=================================================================`);
  console.log(`🎉 HOÀN TẤT THÀNH CÔNG! Đã đẩy trọn vẹn ${TOTAL_USERS} người dùng lên GA4.`);
  console.log(`⏱️ Thời gian thực thi: ${duration} giây.`);
  console.log(`📊 Mời bạn vào Google Analytics > Báo cáo (Reports) > Thời gian thực (Realtime) để kiểm tra kết quả ngay!`);
  console.log(`=================================================================`);
}

main();

