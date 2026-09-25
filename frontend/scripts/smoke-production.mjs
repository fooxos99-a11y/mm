import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('https://license-qb.us/', { waitUntil: 'networkidle' });
    if (errors.length) throw new Error(JSON.stringify({ width, errors }));
    await page.goto('https://license-qb.us/login', { waitUntil: 'networkidle' });
    await page.locator('input[autocomplete="username"]').waitFor();
    await page.locator('input[autocomplete="current-password"]').waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow || errors.length) throw new Error(JSON.stringify({ width, overflow, errors }));
    console.log(`Production login ${width}px: OK`);
    await page.close();
  }
} finally {
  await browser.close();
}
