const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(600);
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '123');
  await page.click('#form-login button[type="submit"]');
  await page.waitForTimeout(1000);
  await page.click('#btn-quick-solo');
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const cs = document.querySelector('.center-stage');
    return Array.from(cs.children).map(c => ({
      tag: c.tagName,
      class: c.className,
      id: c.id,
      scrollWidth: c.scrollWidth,
      offsetWidth: c.offsetWidth,
      minWidth: window.getComputedStyle(c).minWidth,
      width: window.getComputedStyle(c).width
    }));
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
