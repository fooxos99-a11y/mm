import { expect, test } from './support/isolatedTest.mjs';
import AxeBuilder from '@axe-core/playwright';
import { login, swipe } from './support/gesture-helpers.mjs';

test('mobile sidebar scrolls, contains focus and cleans up on resize',async({page},info)=>{
  test.skip(!info.project.use.hasTouch,'Touch input requires a touch-enabled project');
  await page.setViewportSize({width:320,height:568});await login(page);
  await page.locator('.dashboard-indicators-grid').waitFor();
  const sidebar=page.locator('.dashboard-sidebar');
  await expect(sidebar).toBeHidden();
  const opener=page.locator('.dashboard-topbar__mobile button');
  await opener.tap();await expect(sidebar).toBeVisible();
  await expect.poll(()=>sidebar.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  await swipe(page,220,480,120);
  await expect.poll(()=>sidebar.evaluate(e=>e.scrollTop)).toBeGreaterThan(20);
  await page.keyboard.press('Escape');await expect(sidebar).toBeHidden();await expect(opener).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>document.body.style.position)).not.toBe('fixed');
  await opener.tap();await page.setViewportSize({width:1200,height:800});
  await expect(sidebar).toBeVisible();
  await expect.poll(()=>sidebar.evaluate(e=>e.tagName)).toBe('ASIDE');
  await expect.poll(()=>page.evaluate(()=>document.body.style.position)).not.toBe('fixed');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await expect(sidebar).toBeHidden();
  await opener.tap();
  await sidebar.getByRole('button',{name:'إغلاق القائمة',exact:true}).tap();
  await expect(sidebar).toBeHidden();
});

test('short mobile dialogs expose save and cancel after a touch swipe',async({page},info)=>{
  test.skip(!info.project.use.hasTouch,'Touch input requires a touch-enabled project');
  await login(page);
  for(const size of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const panel of ['satisfaction','settings&settingsItem=archive']){
      await page.goto(`dashboard?panel=${panel}`);
      await page.locator(panel==='satisfaction'?'.satisfaction-admin':'.admin-archive-view').waitFor();
      await page.locator('.dashboard-topbar').getByRole('button',{name:'إضافة',exact:true}).tap();
      const dialog=page.locator('dialog[open]');
      if(panel.includes('archive'))await dialog.locator('input').first().fill('اختبار الوصول دون حفظ');
      for(let n=0;n<4;n++)await swipe(page,Math.floor(size.width/2),size.height-60,100);
      const save=dialog.getByRole('button',{name:'إضافة',exact:true});
      await expect(save).toBeInViewport();
      await save.click({trial:true});
      await dialog.getByRole('button',{name:'إلغاء',exact:true}).tap();
      await expect(dialog).toHaveCount(0);
    }
  }
});

test('user and satisfaction dialogs have accessible field names and contrast',async({page})=>{
  await login(page);
  for(const panel of ['users','satisfaction']){
    await page.goto(`dashboard?panel=${panel}`);
    if(panel==='users')await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
    else await page.locator('.dashboard-topbar').getByRole('button',{name:'إضافة',exact:true}).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(results.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  }
});
