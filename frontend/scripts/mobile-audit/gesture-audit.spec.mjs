import { test, expect } from '@playwright/test';
import { auditDir, recorder, swipe, login, sidebarState } from './gesture-helpers.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('audit actual touch scrolling and sidebar transitions', async ({page}) => {
  test.setTimeout(240000);
  const record=recorder('sidebar');
  await login(page);
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:768,height:1024}]) {
    await page.setViewportSize(size); await page.goto('dashboard');
    await page.locator('.dashboard-indicators-grid').waitFor();
    await page.locator('.dashboard-topbar__mobile button').tap();
    await page.waitForTimeout(350);
    for(const position of ['button','edge']) {
      await page.locator('.dashboard-sidebar').evaluate(e=>{e.scrollTop=0;});
      const x=position==='button'?size.width-100:size.width-4;
      const y=Math.min(size.height-80,480);
      const before=await sidebarState(page,x,y);
      await swipe(page,x,y,120);
      const after=await sidebarState(page,x,y);
      record({case:'sidebar-swipe',size,position,before,after,moved:after.scroll>before.scroll+10});
    }
    // Scroll programmatically only to make the separate submenu scenario reachable.
    const settings=page.locator('.dashboard-sidebar').getByRole('button',{name:'الاعدادات',exact:true});
    await settings.scrollIntoViewIfNeeded();await settings.tap();
    const before=await sidebarState(page,size.width-100,Math.min(size.height-80,480));
    await swipe(page,size.width-100,Math.min(size.height-80,480),120);
    record({case:'settings-swipe',size,before,after:await sidebarState(page,size.width-100,120)});
    await page.screenshot({path:path.join(auditDir,`sidebar-${size.width}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await page.goto('dashboard');await page.locator('.dashboard-indicators-grid').waitFor();
  await page.locator('.dashboard-topbar__mobile button').tap();
  await page.setViewportSize({width:1200,height:800});
  const initial=await page.evaluate(()=>scrollY);await page.mouse.move(650,500);await page.mouse.wheel(0,500);await page.waitForTimeout(500);
  record({case:'resize-open-menu-to-desktop',initial,afterWheel:await page.evaluate(()=>scrollY),state:await sidebarState(page,100,400)});
  await page.goto('dashboard?panel=users');await page.locator('.people-page').waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.dashboard-topbar__mobile button').tap();
  await page.goBack();
  await page.locator('.dashboard-indicators-grid').waitFor();
  record({case:'browser-back-menu',url:page.url(),state:await sidebarState(page,100,400)});
});

test('audit WebKit layout and scrolling compatibility',async()=>{
  test.setTimeout(120000);
  const result=spawnSync(process.execPath,['mobile-webkit-followup.mjs',process.env.E2E_BASE_URL],{encoding:'utf8',timeout:110000,windowsHide:true});
  console.log(result.stdout,result.stderr);expect(result.status).toBe(0);
});

test('audit modal swipe and short viewport access', async ({page})=>{
  test.setTimeout(240000);const record=recorder('modals');await login(page);
  for(const size of [{width:320,height:568},{width:390,height:400},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const entry of [{panel:'satisfaction',ready:'.satisfaction-admin',name:'إضافة',dialog:'.satisfaction-admin__dialog'}, {panel:'users',ready:'.people-page',dialog:'.people-dialog'}, {panel:'completion',ready:'.completion-page',name:'متطلبات الاجتياز',dialog:'.completion-requirements-dialog'},{panel:'settings&settingsItem=archive',ready:'.admin-archive-view',name:'إضافة',dialog:'.archive-dialog'}]){
      await page.goto('dashboard?panel='+entry.panel);await page.locator(entry.ready).waitFor();
      if(entry.name)await page.locator('.dashboard-topbar').getByRole('button',{name:entry.name,exact:true}).tap();else await page.locator('.people-toolbar-button--primary').tap();
      const dialog=page.locator(entry.dialog+':visible');await dialog.waitFor();
      if(entry.panel.includes('archive'))await dialog.locator('input').first().fill('فحص اللمس دون حفظ');
      const before=await dialog.boundingBox();
      for(let i=0;i<3;i++)await swipe(page,Math.round(size.width/2),size.height-75,110);
      const controls=[];
      for(const b of await dialog.locator('button').all()){
        if(!await b.isVisible()||!await b.isEnabled())continue;
        const item={name:(await b.innerText()).trim()||await b.getAttribute('aria-label'),box:await b.boundingBox()};
        try{await b.click({trial:true,timeout:1000});item.reachable=true;}catch{item.reachable=false;}
        controls.push(item);
      }
      record({case:'modal-swipe',size,panel:entry.panel,before,after:await dialog.boundingBox(),controls});
      await page.screenshot({path:path.join(auditDir,`modal-${size.width}-${size.height}-${entry.panel.replace(/[^a-z]/g,'_')}.png`)});
    }
  }
});

test('audit student touch navigation and page scroll',async({page})=>{
  test.setTimeout(120000);const record=recorder('student');
  await login(page,'e2e-student-role','E2E-Role-2026!');
  for(const size of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);await page.goto('student');await page.locator('.student-page').waitFor();
    await page.getByRole('button',{name:'فتح القائمة',exact:true}).tap();await page.waitForTimeout(350);
    const x=size.width-100,y=size.height-75;
    const before=await sidebarState(page,x,y);await swipe(page,x,y,100);
    record({case:'student-sidebar-swipe',size,before,after:await sidebarState(page,x,100)});
    await page.locator('.dashboard-sidebar').getByRole('button',{name:'المؤشرات',exact:true}).tap();
    await page.locator('.student-indicators-card').waitFor();
    const start=await page.evaluate(()=>scrollY);await swipe(page,Math.round(size.width/2),size.height-70,100);
    record({case:'student-page-swipe',size,start,end:await page.evaluate(()=>scrollY),menu:await page.locator('.dashboard-sidebar').getAttribute('class')});
  }
});

test('audit public touch scroll and registration failure recovery',async({page})=>{
  test.setTimeout(120000);const record=recorder('public');
  for(const route of ['','practitioner','registration']){
    await page.goto(route);await page.locator('h1').first().waitFor();await page.waitForTimeout(1000);
    const before=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight}));
    await swipe(page,195,700,200);const after=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight}));
    record({case:'public-swipe',route,before,after});
  }
  await page.route('**/api/public/registration**',route=>route.abort());
  await page.goto('registration');
  await expect(page.locator('.registration-entry__state--error')).toBeVisible();
  record({case:'registration-network-error',text:await page.locator('.registration-entry__state--error').innerText()});
  await page.unroute('**/api/public/registration**');
  await page.locator('.registration-entry__state--error button').tap();
  await expect(page.locator('.registration-entry__form,.registration-entry__state--closed')).toBeVisible();
  record({case:'registration-retry',recovered:true});
});
