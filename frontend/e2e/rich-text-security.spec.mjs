import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sanitizerPath = fileURLToPath(new URL('../src/utils/documentContent.js', import.meta.url));
const sanitizerSource = `${readFileSync(sanitizerPath, 'utf8').replaceAll('export ', '')}
window.__sanitizeRichTextHtml = sanitizeRichTextHtml;`;

test('client rich text sanitizer strips executable HTML before rendering', async ({ page }) => {
  await page.setContent('<main id="target"></main>');
  await page.addScriptTag({ content: sanitizerSource });

  const sanitized = await page.evaluate(() => window.__sanitizeRichTextHtml(
    '<script>window.__xss = 1</script><p onclick="window.__xss = 2">آمن<a href="javascript:window.__xss = 3">رابط</a><img src=x onerror="window.__xss = 4" onloadstart="window.__xss = 5"></p>',
  ));

  expect(sanitized).not.toMatch(/script|onclick|onerror|onloadstart|javascript:/i);
  expect(sanitized).toContain('<p>آمن<a>رابط</a><img></p>');

  await page.locator('#target').evaluate((target, html) => { target.innerHTML = html; }, sanitized);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});
