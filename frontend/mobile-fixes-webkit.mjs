import { webkit, devices, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const root='../docs/mobile-audit-2026-09-12/fixes';mkdirSync(root,{recursive:true});
const results=[];
const deadline=setTimeout(()=>{console.error('WebKit verification exceeded 120 seconds');process.exit(1);},120000);
deadline.unref();
const browser=await webkit.launch({headless:true});
try {
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.goto(process.argv[2]+'login');
  await page.locator('[autocomplete=username]').fill('e2e-admin');
  await page.locator('[autocomplete=current-password]').fill('E2E-Momars-2026!');
  await page.locator('form button[type=submit]').tap();await page.waitForURL('**/dashboard');
  console.log('WebKit login ready');
  for(const size of [{width:320,height:568},{width:390,height:400},{width:844,height:390}]) {
    await page.setViewportSize(size);await page.goto(process.argv[2]+'dashboard');await page.locator('.dashboard-indicators-grid').waitFor();
    const sidebar=page.locator('.dashboard-sidebar');await expect(sidebar).toBeHidden();
    await page.locator('.dashboard-topbar__mobile button').tap();
    await expect(sidebar).toHaveJSProperty('open',true);
    await expect.poll(()=>sidebar.evaluate(e=>e.contains(document.activeElement))).toBe(true);
    const settings=sidebar.getByRole('button',{name:'الاعدادات',exact:true});
    await settings.tap();
    await page.screenshot({path:root+`/webkit-sidebar-${size.width}.png`});
    console.log(`WebKit sidebar ${size.width}: closing by touch`);
    await sidebar.getByRole('button',{name:'إغلاق القائمة',exact:true}).tap();await expect(sidebar).toBeHidden();
    await expect.poll(()=>page.evaluate(()=>document.body.style.position)).not.toBe('fixed');
    results.push({size,case:'native-sidebar-focus-close',passed:true});
    writeFileSync(root+'/webkit-verification.json',JSON.stringify(results,null,2));
    for(const panel of ['satisfaction','settings&settingsItem=archive']){
      await page.goto(process.argv[2]+'dashboard?panel='+panel);
      await page.locator(panel==='satisfaction'?'.satisfaction-admin':'.admin-archive-view').waitFor();
      await page.locator('.dashboard-topbar').getByRole('button',{name:'إضافة',exact:true}).tap();
      console.log(`WebKit dialog ${size.width}: ${panel}`);
      const dialog=page.locator('dialog[open]');
      if(panel.includes('archive'))await dialog.locator('input').first().fill('فحص WebKit دون حفظ');
      else {
        const select=dialog.locator('.app-select').first();await select.locator('.v-field').tap();
        await expect(page.getByRole('option').first()).toBeVisible();await page.getByRole('option').first().tap();
      }
      const save=dialog.getByRole('button',{name:'إضافة',exact:true});await save.click({trial:true});await expect(save).toBeInViewport();
      await page.screenshot({path:root+`/webkit-${size.width}-${panel.includes('archive')?'archive':'satisfaction'}.png`});
      await dialog.getByRole('button',{name:'إلغاء',exact:true}).tap();await expect(dialog).toHaveCount(0);
      results.push({size,case:panel,passed:true,method:'WebKit scroll-into-view and pointer reachability; not physical iPhone swipe'});
      writeFileSync(root+'/webkit-verification.json',JSON.stringify(results,null,2));
    }
  }
}catch(error){results.push({passed:false,error:error.message});process.exitCode=1;}
finally{writeFileSync(root+'/webkit-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();clearTimeout(deadline);}
