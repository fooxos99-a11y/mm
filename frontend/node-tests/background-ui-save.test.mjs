import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/features/people/peopleStudentActionMethods.js', import.meta.url), 'utf8');
const { default: methods, transfers } = await import(`data:text/javascript;base64,${Buffer.from(
  'export const transfers = []; const transferStudentToReciter = async (...args) => transfers.push(args);\n' + source.slice(source.indexOf('export default')),
).toString('base64')}`);
const context = () => {
  const student = { id: 'teacher', reciterId: 'old' };
  return {
    reciterDialogStudent: student, reciterDialogReciterId: 'next', reciterDialogSaving: false,
    canAssignReciter: true, canEditReciter: true, reciterDialogOpen: true,
    personRecords: { student: { teacher: student }, reciter: {
      old: { id: 'old', studentIds: ['teacher', 'other'] }, next: { id: 'next', studentIds: ['linked'] },
    } },
    showTimedToast() {}, refreshDashboardSnapshot: async options => assert.deepEqual(options, { background: true }),
  };
};

test('reciter selection keeps existing permissions and refuses unauthorized unlink', async () => {
  const before = transfers.length;
  const vm = context(); vm.canAssignReciter = false;
  await methods.submitReciterAssignment.call(vm);
  assert.equal(transfers.length, before);
  vm.canAssignReciter = true; vm.canEditReciter = false; vm.reciterDialogReciterId = '';
  await methods.submitReciterAssignment.call(vm);
  assert.equal(vm.reciterDialogReciterId, 'old');
  assert.equal(transfers.length, before);
});
test('automatic assignment keeps the dialog open and preserves other cached links', async () => {
  const vm = context();
  await methods.submitReciterAssignment.call(vm);
  assert.deepEqual(transfers.at(-1), ['teacher', 'next']);
  assert.equal(vm.reciterDialogOpen, true);
  assert.equal(vm.personRecords.student.teacher.reciterId, 'next');
  assert.deepEqual(vm.personRecords.reciter.old.studentIds, ['other']);
  assert.deepEqual(vm.personRecords.reciter.next.studentIds, ['linked', 'teacher']);
  assert.equal(vm.reciterDialogSaving, false);
});
test('unlink reloads the complete reciter record and preserves links added since opening', async () => {
  const vm = context(); vm.reciterDialogReciterId = '';
  vm.loadPerson = async (type, id) => {
    assert.deepEqual([type, id], ['reciter', 'old']);
    return { id, name: 'Reader', loginCode: '123', branchId: 'male', studentIds: ['teacher', 'other', 'newly-linked'] };
  };
  let payload;
  vm.saveReciter = async value => { payload = value; };
  await methods.submitReciterAssignment.call(vm);
  assert.deepEqual(payload.linkedStudentIds, ['other', 'newly-linked']);
  assert.equal(payload.backgroundRefresh, true);
  assert.equal(vm.personRecords.student.teacher.reciterId, null);
  assert.equal(vm.reciterDialogOpen, true);
});
test('failed unlink restores the selection and exposes the error without claiming success', async () => {
  const vm = context(); vm.reciterDialogReciterId = '';
  vm.loadPerson = async () => ({ loginCode: '123', studentIds: ['teacher'] });
  vm.saveReciter = async () => { throw new Error('offline'); };
  vm.showTimedToast = () => assert.fail('failed save announced success');
  await methods.submitReciterAssignment.call(vm);
  assert.equal(vm.reciterDialogReciterId, 'old');
  assert.equal(vm.personRecords.student.teacher.reciterId, 'old');
  assert.match(vm.dialogDataError, /تعذر/);
  assert.equal(vm.reciterDialogSaving, false);
});

const dashboardSource = await readFile(new URL('../src/store/modules/dashboard.js', import.meta.url), 'utf8');
const dashboard = await import(`data:text/javascript;base64,${Buffer.from(
  'let fetcher; export const setFetcher = value => { fetcher = value; }; const fetchDashboardSnapshot = () => fetcher(); const fetchDashboardShell = () => fetcher();\n' + dashboardSource.slice(dashboardSource.indexOf('const requests')),
).toString('base64')}`);
for (const status of [200, 503, 401]) {
  test(`background snapshot ${status} retains the page and honors session expiry`, async () => {
    dashboard.setFetcher(async () => {
      if (status !== 200) throw { response: { status } };
      return { courses: [] };
    });
    const commits = [];
    const state = { currentUser: { id: 'admin' }, authGeneration: 1, authChecked: true };
    const rechecks = [];
    const dispatch = async (name, options) => {
      rechecks.push([name, options]);
      state.currentUser = null; state.authGeneration += 1;
      return null;
    };
    await dashboard.dashboardActions.loadDashboardSnapshot({ state, commit: (...args) => commits.push(args), dispatch }, { background: true });
    assert.equal(commits.some(([name, value]) => name === 'setDashboardLoading' && value === true), false);
    assert.equal(commits.some(([name]) => name === 'clearAuthState'), false);
    assert.deepEqual(rechecks, status === 401 ? [['bootstrapAuth', { force: true }]] : []);
    assert.equal(state.currentUser === null, status === 401);
    assert.equal(commits.some(([name]) => name === 'setDashboardError'), status === 401);
    assert.equal(commits.some(([name]) => name === 'setDashboardSnapshot'), status === 200);
  });
}
