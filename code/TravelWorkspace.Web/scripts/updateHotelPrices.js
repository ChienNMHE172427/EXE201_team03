import fs from 'fs';
import puppeteer from 'puppeteer';

const hotelLinksPath = './src/hotelLinks.json';
const servicesDataPath = './src/servicesData.json';

async function updatePrices() {
  console.log('Bắt đầu cập nhật giá phòng từ Traveloka...');
  
  const hotelLinks = JSON.parse(fs.readFileSync(hotelLinksPath, 'utf8'));
  const servicesData = JSON.parse(fs.readFileSync(servicesDataPath, 'utf8'));
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const [hotelName, shortenUrl] of Object.entries(hotelLinks)) {
    try {
      console.log(`Đang lấy giá cho: ${hotelName}...`);
      
      await page.goto(shortenUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      await page.waitForFunction(() => {
        return document.body.innerText.includes('VND') || document.body.innerText.includes('₫');
      }, { timeout: 15000 }).catch(() => console.log(' Không tìm thấy dấu hiệu giá, quét toàn trang...'));
      
      const pageText = await page.evaluate(() => document.body.innerText);
      
      const priceMatch = pageText.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(VND|₫)/i);
      
      let newPrice = '';
      if (priceMatch) {
        newPrice = `Từ ${priceMatch[1]} ₫`;
        console.log(`=> Đã lấy được giá: ${newPrice}`);
      } else {
        console.log(`=> Không tìm thấy giá rõ ràng.`);
        continue;
      }
      
      let updated = false;
      for (const svc of servicesData) {
        if (svc.category === 'Lưu trú' && svc.title.includes(hotelName)) {
          svc.price = newPrice;
          updated = true;
        }
      }
      
      if (!updated) {
        for (const svc of servicesData) {
          if (svc.category === 'Lưu trú' && (hotelName.includes(svc.title) || svc.title.includes(hotelName.split(' ')[0]))) {
            svc.price = newPrice;
          }
        }
      }
      
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.log(`Lỗi khi lấy giá cho ${hotelName}: ${err.message}`);
    }
  }

  await browser.close();
  
  fs.writeFileSync(servicesDataPath, JSON.stringify(servicesData, null, 2));
  console.log('✅ Hoàn tất cập nhật giá phòng vào servicesData.json!');
}

updatePrices().catch(console.error);
