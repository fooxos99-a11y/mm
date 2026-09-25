import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
const page=await context.newPage();
const data={};
try {
await page.goto(process.argv[2]+'login');
await page.locator('[autocomplete=username]').fill('e2e-admin');
await page.locator('[autocomplete=current-password]').fill('E2E-Momars-2026!');
await page.locator('form button[type=submit]').click();
await page.waitForURL('**/dashboard');
await page.goto(process.argv[2]+'dashboard?panel=satisfaction');
await page.getByRole('button',{name:'إضافة',exact:true}).click();
const save=page.locator('dialog[open]').getByRole('button',{name:'إضافة',exact:true});
data.before=await save.boundingBox();
data.layout=await page.locator('dialog[open]').evaluate(e=>[e,...e.querySelectorAll('.modal-box,.v-card,.app-dialog-footer')].map(n=>({cls:n.className,h:n.clientHeight,scroll:n.scrollHeight,overflow:getComputedStyle(n).overflowY,maxHeight:getComputedStyle(n).maxHeight})));
try {await save.click({trial:true,timeout:5000}); data.reachable=true;}catch(e){data.reachable=false;data.error=e.message;}
data.after=await save.boundingBox();
await page.screenshot({path:'../docs/mobile-audit-2026-09-12/dialog-save-reachability.png'});
await page.goBack(); data.backUrl=page.url();data.dialogAfterBack=await page.locator('dialog[open]').count();
await page.goto(process.argv[2]+'dashboard');await page.locator('.dashboard-indicators-grid').waitFor();
data.closedSidebar=await page.locator('.dashboard-sidebar').evaluate(e=>({ariaHidden:e.getAttribute('aria-hidden'),inert:e.inert,links:[...e.querySelectorAll('a,button')].filter(n=>n.tabIndex>=0).length,rect:e.getBoundingClientRect().toJSON()}));
await page.locator('.dashboard-topbar__mobile button').click();
data.openSidebar=await page.evaluate(()=>({active:document.activeElement?.outerHTML.slice(0,300),bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow}));
await page.keyboard.press('Escape'); data.escapeCloses=!(await page.locator('.dashboard-sidebar').getAttribute('class')).includes('--open');
}finally{writeFileSync('../docs/mobile-audit-2026-09-12/dialog-investigation.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));await browser.close();}
