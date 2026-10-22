const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(600);
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '123');
  await page.click('#form-login button[type="submit"]');
  await page.waitForTimeout(1000);
  await page.click('#btn-quick-solo');
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const el = document.querySelector('.board-wrapper');
    const parents = [];
    let cur = el;
    while (cur && cur !== document.body) {
      const comp = window.getComputedStyle(cur);
      const r = cur.getBoundingClientRect();
      parents.push({
        tag: cur.tagName,
        id: cur.id,
        class: cur.className,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        width: comp.width,
        maxWidth: comp.maxWidth,
        minWidth: comp.minWidth,
        display: comp.display,
        position: comp.position,
        overflow: comp.overflow
      });
      cur = cur.parentElement;
    }
    return parents;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
