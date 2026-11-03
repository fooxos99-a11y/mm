import test from 'node:test';
import assert from 'node:assert/strict';
import refresh from '../src/features/assessment/attendanceRefresh.js';

test('attendance refresh shares persisted data and preserves pending manual edits', async () => {
  const previous = globalThis.document;
  globalThis.document = { visibilityState: 'visible' };
  try {
    const calls = [];
    const vm = { viewMode: 'attendance', loadDashboardSnapshot: async options => calls.push(options) };
    const run = () => refresh.methods.refreshAttendanceSilently.call(vm);
    await run();
    assert.deepEqual(calls, [{ background: true }]);
    for (const field of ['attendanceSaveTimer', 'isSavingAttendance', 'attendanceRefreshBusy', 'attendanceRefreshDisposed']) {
      vm[field] = true;
      await run();
      vm[field] = false;
    }
    vm.attendanceRemovedIds = ['pending-removal'];
    await run();
    vm.attendanceRemovedIds = [];
    vm.saveStatusText = 'تعذر حفظ التحضير';
    await run();
    vm.saveStatusText = '';
    globalThis.document.visibilityState = 'hidden';
    await run();
    assert.equal(calls.length, 1);
    globalThis.document.visibilityState = 'visible';
    vm.viewMode = 'post';
    await run();
    assert.equal(calls.length, 1);
    vm.isAttendanceResultsType = true;
    vm.hasSelectedResultsSection = true;
    vm.resultsPage = 3;
    vm.loadResultsPage = async (...args) => calls.push(args);
    await run();
    assert.deepEqual(calls[1], [3, true, true]);
    vm.resultsLoading = true;
    await run();
    assert.equal(calls.length, 2);
  } finally { globalThis.document = previous; }
});
