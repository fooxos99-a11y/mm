import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('people view delegates the directory and management dialogs', async () => {
  const [view, controller] = await Promise.all([
    source('../src/views/AdminPeopleView.vue'),
    source('../src/features/people/adminPeopleView.js'),
  ]);

  for (const component of ['PeopleDirectoryPanel', 'PeopleManagementDialogs', 'PeopleEditorDialog']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }

  assert.equal(view.includes('class="people-card"'), false);
  assert.equal(view.includes('<AppDialog'), false);
});

test('archive view delegates records details and operation dialogs', async () => {
  const [view, controller, dataMethods] = await Promise.all([
    source('../src/views/AdminArchiveView.vue'),
    source('../src/features/controllers/AdminArchiveView.js'),
    source('../src/features/archive/archiveDataMethods.js'),
  ]);

  for (const component of ['ArchiveRecordsPanel', 'ArchivedStudentDetailDialog', 'ArchiveManagementDialogs']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }

  assert.equal(view.includes('<v-data-table'), false);
  assert.equal(view.includes('<AppDialog'), false);
  assert.equal(controller.includes("from '../../services/api'"), false);
  assert.match(dataMethods, /from '\.\.\/\.\.\/services\/archiveService'/);
});

test('people and archive controls keep touch-friendly targets', async () => {
  const [peopleStyles, archiveStyles, archivePanel] = await Promise.all([
    source('../src/styles/views/admin-people.css'),
    source('../src/styles/views/admin-archive.css'),
    source('../src/components/archive/ArchiveRecordsPanel.vue'),
  ]);

  assert.match(peopleStyles, /\.people-card__icon-button[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(archiveStyles, /\.admin-archive-view__select-option-delete[\s\S]*?min-height: 48px;/);
  assert.match(archivePanel, /v-if="selectedArchive"[\s\S]*?حذف الأرشيف نهائيًا/);
  assert.match(archiveStyles, /\.admin-archive-view__search-input[\s\S]*?min-height: 48px;/);
});
