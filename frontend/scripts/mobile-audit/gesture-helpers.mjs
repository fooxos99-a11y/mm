import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export const auditDir = path.resolve('../docs/mobile-audit-2026-09-12/gesture-followup');
mkdirSync(auditDir, { recursive: true });
export function recorder(name) {
  const records = [];
  return (record) => { records.push(record); writeFileSync(path.join(auditDir, `${name}.json`), JSON.stringify(records, null, 2)); console.log(JSON.stringify(record)); };
}
export async function swipe(page, x, fromY, toY) {
  const cdp = await page.context().newCDPSession(page);
  const point = y => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(fromY) });
  for (let i = 1; i <= 14; i++) {
    await page.waitForTimeout(22);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(fromY + (toY - fromY) * i / 14) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(450);
  await cdp.detach();
}
export async function login(page, name = 'e2e-admin', password = 'E2E-Momars-2026!') {
  await page.goto('login');
  await page.locator('[autocomplete=username]').fill(name);
  await page.locator('[autocomplete=current-password]').fill(password);
  await page.locator('form button[type=submit]').tap();
  await page.waitForURL(url => !url.pathname.endsWith('/login'));
}
export async function sidebarState(page, x, y) {
  return page.evaluate(({x,y}) => {
    const e = document.querySelector('.dashboard-sidebar');
    const hit = document.elementFromPoint(x,y);
    const ancestors = [];
    for (let n=hit;n;n=n.parentElement) ancestors.push({tag:n.tagName,cls:typeof n.className==='string'?n.className:'svg',touch:getComputedStyle(n).touchAction,overflow:getComputedStyle(n).overflowY});
    return {scroll:e.scrollTop,height:e.clientHeight,content:e.scrollHeight,rect:e.getBoundingClientRect().toJSON(),hit:hit?.outerHTML.slice(0,220),ancestors,bodyOverflow:getComputedStyle(document.body).overflow,windowY:scrollY};
  },{x,y});
}
