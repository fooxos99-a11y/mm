import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sections = [
  'HomeIntroSettings',
  'HomeAboutSettings',
  'HomeIndicatorsSettings',
  'HomeProgramStructureSettings',
  'HomeRequirementsSettings',
  'HomeScheduleSettings',
  'HomeFooterSettings',
];

test('home page settings delegates each content area to a focused component', async () => {
  const [view, controller] = await Promise.all([
    source('../src/views/AdminHomePageSettingsView.vue'),
    source('../src/features/controllers/AdminHomePageSettingsView.js'),
  ]);

  for (const component of sections) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(`import ${component}`));
  }

  assert.equal(view.includes('<AppTextField'), false);
  assert.equal(view.includes('<v-textarea'), false);
  assert.match(view, /<HomeSettingsDeleteDialog/);
});

test('home settings section components keep their inputs and delete actions accessible', async () => {
  const files = await Promise.all(sections.map((name) => source(`../src/components/home/${name}.vue`)));
  const combined = files.join('\n');

  assert.match(combined, /aria-label="حذف رابط التنقل"/);
  assert.match(combined, /aria-label="حذف المجال"/);
  assert.match(combined, /label="حقل كلمة المرور"/);
  assert.equal(combined.includes('HomePageSettingsDetails'), false);
});

test('home settings preserve mobile touch targets', async () => {
  const styles = await source('../src/styles/views/admin-home-page-settings.css');

  assert.match(styles, /\.home-page-settings__card-head \.app-icon-button[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.home-page-settings__footer \.app-button[\s\S]*?min-height: 44px;/);
});
