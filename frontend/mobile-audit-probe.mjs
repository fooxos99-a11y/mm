import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = '../docs/mobile-audit-2026-09-12';
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const records = [];
const origin = process.argv[2];
const inspect = async (page, label, axe = false) => {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const visible = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.right > 0 && r.left < innerWidth; };
    const describe = e => { const r = e.getBoundingClientRect(); return {tag:e.tagName, cls: String(e.className).slice(0,150), text:(e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || '').trim().slice(0,85), x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
    const controls = [...document.querySelectorAll('button,a[href],input:not([type=hidden]),textarea,select,[role=button]')].filter(visible);
    return { width:innerWidth,height:innerHeight,pageWidth:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth),
      smallControls:controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(describe),
      smallInputs:controls.filter(e=>['INPUT','TEXTAREA','SELECT'].includes(e.tagName)&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({...describe(e),font:getComputedStyle(e).fontSize})),
      edgeControls:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1;}).map(describe),
      clippedText:[...document.querySelectorAll('h1,h2,h3,button,label')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='hidden').map(describe),
      dialogs:[...document.querySelectorAll('dialog[open],[role=dialog]')].filter(visible).map(e=>({...describe(e),name:e.getAttribute('aria-label'),labelledby:e.getAttribute('aria-labelledby')}))};
  });
  const item = {label,...metrics};
  if(axe) item.violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,8)}));
  records.push(item);
  writeFileSync(`${root}/${process.argv[3]==='public'?'public-measurements':'measurements'}.json`,JSON.stringify(records,null,2));
  if(metrics.width===320) await page.screenshot({path:`${root}/${label.replace(/[^a-z0-9-]/gi,'_')}.png`,fullPage:true});
  console.log(label,metrics.width,'small',metrics.smallControls.length,'edge',metrics.edgeControls.length,'axe',item.violations?.length??'-');
};
try {
  for (const width of [320,390,768,844]) {
    const context=await browser.newContext({viewport:{width,height:width===844?390:width===320?568:844},isMobile:true,hasTouch:true,locale:'ar-SA'});
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    for(const route of ['', 'practitioner','login','registration','not-found-audit']) {
      await page.goto(origin+route); await page.locator('h1').first().waitFor();
      if(route==='registration') await page.locator('.registration-entry__form,.registration-entry__state--closed,.registration-entry__state--error').waitFor();
      await page.waitForTimeout(700);
      await inspect(page,route||'home',width===320);
    }
    if(process.argv[3]==='public'){await context.close();continue;}
    await page.goto(origin+'login');
    await page.locator('[autocomplete=username]').fill('e2e-admin');
    await page.locator('[autocomplete=current-password]').fill('E2E-Momars-2026!');
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    for(const panel of ['', 'courses','tasks','finalexam','satisfaction','users','notifications','materials','results','completion','settings&settingsItem=registration','settings&settingsItem=home','settings&settingsItem=archive','settings&settingsItem=permissions']) {
      await page.goto(origin+'dashboard'+(panel?'?panel='+panel:''));
      const selectors = { '':'.dashboard-indicators-grid',courses:'.assessment-page',tasks:'.tasks-page',finalexam:'.final-exam-page',satisfaction:'.satisfaction-admin',users:'.people-page',notifications:'.communications-page',materials:'.admin-training-materials',results:'.results-view',completion:'.completion-page','settings&settingsItem=registration':'.registration-admin','settings&settingsItem=home':'.home-page-settings','settings&settingsItem=archive':'.admin-archive-view','settings&settingsItem=permissions':'.permissions-admin' };
      await page.locator(selectors[panel]).waitFor({timeout:30000});
      await page.waitForTimeout(350);
      await inspect(page,'admin-'+(panel||'overview'));
    }
    await page.goto(origin+'dashboard?panel=satisfaction');
    await page.getByRole('button',{name:'إضافة',exact:true}).click();
    await inspect(page,'dialog-satisfaction',width===320);
    await context.close();
  }
} finally { await browser.close(); }
