import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const result=[];
try {
for(const size of [{width:320,height:568},{width:844,height:390}]){
const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true});const page=await context.newPage();
await page.goto(process.argv[2]+'login');await page.locator('[autocomplete=username]').fill('e2e-admin');await page.locator('[autocomplete=current-password]').fill('E2E-Momars-2026!');await page.locator('form button[type=submit]').click();await page.waitForURL('**/dashboard');
const cases=[['satisfaction','إضافة','.satisfaction-admin__dialog'],['users',null,'.people-dialog'],['completion','متطلبات الاجتياز','.completion-requirements-dialog'],['completion','إغلاق واعتماد النتائج','.completion-confirm'],['settings&settingsItem=archive','إضافة','.archive-dialog']];
for(const [panel,name,selector] of cases){
await page.goto(process.argv[2]+'dashboard?panel='+panel);
await page.locator(({satisfaction:'.satisfaction-admin',users:'.people-page',completion:'.completion-page','settings&settingsItem=archive':'.admin-archive-view'})[panel]).waitFor();
if(name)await page.locator('.dashboard-topbar').getByRole('button',{name,exact:true}).click();else await page.locator('.people-toolbar-button--primary').click();
const dialog=page.locator(selector+':visible');await dialog.waitFor();
const item={...size,panel,name,buttons:[]};
const buttons=dialog.locator('button');
for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i);if(!(await b.isVisible())||!(await b.isEnabled()))continue;const entry={name:(await b.innerText()).trim()||await b.getAttribute('aria-label'),box:await b.boundingBox()};try{await b.click({trial:true,timeout:1500});entry.reachable=true;}catch{entry.reachable=false;}item.buttons.push(entry);}
if(size.width===320)item.violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,6)}));
await page.screenshot({path:`../docs/mobile-audit-2026-09-12/modal-${size.width}-${panel.replace(/[^a-z]/g,'_')}-${name==='متطلبات الاجتياز'?'requirements':'main'}.png`});
result.push(item);writeFileSync('../docs/mobile-audit-2026-09-12/modal-matrix.json',JSON.stringify(result,null,2));console.log(size.width,panel,name,JSON.stringify(item.buttons.filter(x=>!x.reachable)),item.violations?.map(x=>x.id));
}
await context.close();
}
}finally{await browser.close();}
