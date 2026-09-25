import {chromium,webkit,devices} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const records=[];const root='../docs/mobile-audit-2026-09-12/gesture-followup/live';
for(const engine of ['chromium','webkit']){
const browser=await (engine==='chromium'?chromium:webkit).launch({headless:true,...(engine==='chromium'?{channel:'chrome'}:{})});
try{
const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();page.setDefaultTimeout(15000);
for(const route of ['','login','registration']){
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
try{
const response=await page.goto('https://license-qb.us/'+route,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor();
if(route==='registration')await page.locator('.registration-entry__form,.registration-entry__state--closed,.registration-entry__state--error').waitFor();
await page.waitForTimeout(700);
records.push({engine,route,status:response.status(),url:page.url(),errors,metrics:await page.evaluate(()=>({width:innerWidth,content:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),title:document.querySelector('h1')?.textContent.trim(),registrationState:document.querySelector('.registration-entry__state')?.textContent.trim()}))});
await page.screenshot({path:root+`/${engine}-${route||'home'}.png`});
}catch(e){records.push({engine,route,error:e.message,errors});}
page.off('pageerror',onError);writeFileSync(root+'/public-live.json',JSON.stringify(records,null,2));
}
}finally{await browser.close();}
}
console.log(JSON.stringify(records,null,2));
