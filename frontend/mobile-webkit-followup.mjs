import {webkit,devices} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const root='../docs/mobile-audit-2026-09-12/gesture-followup';
const browser=await webkit.launch({headless:true});const output=[];
try{
const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
const page=await context.newPage();page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.argv[2]+'login');await page.locator('[autocomplete=username]').fill('e2e-admin');await page.locator('[autocomplete=current-password]').fill('E2E-Momars-2026!');await page.locator('form button[type=submit]').tap();await page.waitForURL('**/dashboard');await page.locator('.dashboard-indicators-grid').waitFor();
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
await page.setViewportSize(viewport);await page.goto(process.argv[2]+'dashboard');await page.locator('.dashboard-indicators-grid').waitFor();await page.locator('.dashboard-topbar__mobile button').tap();await page.waitForTimeout(400);
const state=()=>page.locator('.dashboard-sidebar').evaluate(e=>({scroll:e.scrollTop,height:e.clientHeight,content:e.scrollHeight,overflow:getComputedStyle(e).overflowY,rect:e.getBoundingClientRect().toJSON()}));
const before=await state();await page.mouse.move(viewport.width-100,Math.min(viewport.height-100,400));let wheelError;
try{await page.mouse.wheel(0,500);await page.waitForTimeout(500);}catch(e){wheelError=e.message;}
const after=await state();
await page.locator('.dashboard-sidebar').getByRole('button',{name:'الاعدادات',exact:true}).tap();
const settingsBefore=await state();await page.mouse.move(viewport.width-100,Math.min(viewport.height-100,400));try{await page.mouse.wheel(0,500);await page.waitForTimeout(500);}catch{}
output.push({engine:'WebKit desktop emulating iPhone; wheel is not a finger swipe',viewport,before,after,wheelError,settingsBefore,settingsAfter:await state(),errors:[...errors]});writeFileSync(root+'/webkit.json',JSON.stringify(output,null,2));
await page.screenshot({path:root+`/webkit-sidebar-${viewport.width}.png`});
}
}catch(e){output.push({error:e.message});writeFileSync(root+'/webkit.json',JSON.stringify(output,null,2));throw e;}finally{await browser.close();}
