import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin = 'https://license-qb.us';
const digest = value => createHash('sha256').update(value).digest('hex');
const files = ['index.html', ...readdirSync('dist/assets').map(name => `assets/${name}`)];
const verified = [];
for (let i = 0; i < files.length; i += 6) {
  await Promise.all(files.slice(i, i + 6).map(async file => {
    const response = await fetch(`${origin}/${file === 'index.html' ? '' : file}`);
    if (!response.ok || digest(Buffer.from(await response.arrayBuffer())) !== digest(readFileSync(`dist/${file}`))) {
      throw new Error(`Published file mismatch: ${file}`);
    }
    verified.push(file);
  }));
}
console.log(`Verified ${verified.length} published files against local SHA256`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    for (const route of ['/', '/login']) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor();
      const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth + 1);
      if (overflow || errors.length) throw new Error(JSON.stringify({ width, route, overflow, errors }));
      results.push({ width, route, passed: true });
    }
    await page.goto(origin + '/dashboard');
    await page.waitForURL('**/login?**');
    results.push({ width, route: '/dashboard', guestRedirect: true });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync('../.deploy/mobile-20260912/verification.json', JSON.stringify({ origin, verifiedFiles: verified.length, results, verifiedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify(results));
