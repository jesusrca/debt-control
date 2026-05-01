const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

const pages = [
  { name: 'Dashboard', path: '/' },
  { name: 'Debts', path: '/debts' },
  { name: 'Transactions', path: '/transactions' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Upload', path: '/upload' },
  { name: 'Settings', path: '/settings' },
];

const viewports = [
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Mobile', width: 390, height: 844 },
];

async function runTest() {
  console.log('Starting Playwright visual test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ page: page.url(), text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    errors.push({ page: page.url(), text: err.message });
  });

  const results = [];

  for (const viewport of viewports) {
    console.log(`\n=== Testing ${viewport.name} viewport (${viewport.width}x${viewport.height}) ===`);

    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const p of pages) {
      console.log(`\nNavigating to ${p.name} (${p.path})...`);

      try {
        await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1000);

        const title = await page.title();
        const bodyText = await page.locator('body').innerText();
        const hasContent = bodyText.length > 50;

        const darkModeToggle = await page.locator('[class*="dark"], [data-theme], button[class*="toggle"], svg[class*="moon"], svg[class*="sun"]').count();

        const screenshotPath = `/tmp/dc-${viewport.name.toLowerCase()}-${p.name.toLowerCase()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  Screenshot: ${screenshotPath}`);

        results.push({
          viewport: viewport.name,
          page: p.name,
          path: p.path,
          status: 'loaded',
          title,
          hasContent,
          darkModeElements: darkModeToggle,
          screenshot: screenshotPath,
        });

        console.log(`  Status: OK | Title: ${title} | Dark mode elements: ${darkModeToggle}`);
      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
        results.push({
          viewport: viewport.name,
          page: p.name,
          path: p.path,
          status: 'failed',
          error: err.message,
        });
      }
    }

    console.log('\nTesting dark mode toggle...');
    try {
      const darkModeBtn = page.locator('button').filter({ has: page.locator('svg[class*="sun"], svg[class*="moon"]') }).first();
      if (await darkModeBtn.count() > 0) {
        await darkModeBtn.click();
        await page.waitForTimeout(500);
        const screenshotPath = `/tmp/dc-${viewport.name.toLowerCase()}-dark-mode.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`  Dark mode screenshot: ${screenshotPath}`);
      } else {
        console.log('  Dark mode toggle not found');
      }
    } catch (err) {
      console.log(`  Dark mode toggle error: ${err.message}`);
    }
  }

  console.log('\n\n=== CONSOLE ERRORS ===');
  if (errors.length === 0) {
    console.log('No console errors found!');
  } else {
    errors.forEach((e, i) => {
      console.log(`${i + 1}. [${e.page}] ${e.text}`);
    });
  }

  console.log('\n\n=== SUMMARY ===');
  results.forEach((r) => {
    const status = r.status === 'loaded' ? '✅' : '❌';
    console.log(`${status} ${r.viewport} - ${r.page}: ${r.status}`);
  });

  await browser.close();
  console.log('\nTest complete!');
}

runTest().catch(console.error);