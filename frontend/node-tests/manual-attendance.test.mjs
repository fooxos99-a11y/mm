import assert from 'node:assert/strict';
import test from 'node:test';
import assessmentMethods from '../src/features/assessment/assessmentAttendanceMethods.js';
import resultsMethods from '../src/features/results/adminResultsDataMethods.js';
import assessmentComputed from '../src/features/assessment/adminAssessmentAttendanceComputed.js';
import resultsComputed from '../src/features/results/adminResultsComputed.js';
import { previousAttendanceRecords } from '../src/features/assessment/attendanceHistory.mjs';

test('attendance history preserves old records while separating the current session, course and branch', () => {
  const students = [{ loginId: 'male', name: 'معلم' }];
  const records = [
    { id: 'legacy', courseId: 'course', loginId: 'male', sessionId: null, createdAt: '2026-01-01', hours: null },
    { id: 'current', courseId: 'course', loginId: 'male', sessionId: 'current' },
    { id: 'other-course', courseId: 'other', loginId: 'male' },
    { id: 'other-branch', courseId: 'course', loginId: 'female' },
    { id: 'older-session', courseId: 'course', loginId: 'male', sessionId: 'older', createdAt: '2026-02-01', hours: 2 },
    { id: 'same-date', courseId: 'course', loginId: 'male', createdAt: '2026-02-01' },
    { id: 'undated', courseId: 'course', loginId: 'male' },
    { id: 'undated2', courseId: 'course', loginId: 'male' },
  ];
  const original = structuredClone(records);
  const history = previousAttendanceRecords(records, students, 'course', 'current');
  assert.deepEqual(history.map(record => record.id), ['older-session', 'same-date', 'legacy', 'undated', 'undated2']);
  assert.equal(history[2].hours, null);
  assert.equal(history[0].hours, 2);
  assert.equal(history[0].studentName, 'معلم');
  assert.deepEqual(records, original);
  assert.deepEqual(previousAttendanceRecords(records, students, 'course', ''), []);
  assert.deepEqual(previousAttendanceRecords(records, students, '', 'current'), []);
});

for (const [name, computed] of [['assessment', assessmentComputed], ['results', resultsComputed]]) {
  test(`${name} keeps the full branch roster before, during and after opening attendance`, () => {
    const students = [{ id: 'm', branchId: 'male' }, { id: 'f', branchId: 'female' }];
    const context = { students, attendanceBranchId: 'male', managedBranchId: '', effectiveAttendanceBranchId: 'male' };
    for (const session of [null, { loading: true }, { id: 'session', isOpen: true }, { id: 'session', isOpen: false }]) {
      context.selectedAttendanceSession = session;
      assert.deepEqual(computed.attendanceStudents.call(context), [students[0]]);
      context.managedBranchId = 'female';
      context.effectiveAttendanceBranchId = 'female';
      assert.deepEqual(computed.attendanceStudents.call(context), [students[1]]);
      context.managedBranchId = '';
      context.effectiveAttendanceBranchId = 'male';
    }
  });
}

for (const [name, methods] of [['assessment', assessmentMethods], ['results', resultsMethods]]) {
  test(`${name} attendance saves only the selected branch and allows clearing it`, async () => {
    const calls = [];
    const context = {
      selectedCourseId: 'course',
      attendanceCourseId: 'course',
      attendanceBranchId: 'female',
      effectiveAttendanceBranchId: 'female',
      managedBranchId: '',
      students: [
        { id: 'm', loginId: 'male', name: 'Male', branchId: 'male' },
        { id: 'f', loginId: 'female', name: 'Female', branchId: 'female' },
      ],
      attendanceChecked: ['m', 'f'],
      setManualAttendance: async (payload) => calls.push(payload),
      $toast: { error: (message) => assert.fail(message) },
    };
    await methods.saveAttendance.call(context);
    assert.deepEqual(calls[0], {
      courseId: 'course', branchCode: 'female',
      presentStudents: [{ loginId: 'female', studentName: 'Female', studentId: 'f' }],
    });
    context.attendanceChecked = ['m'];
    await methods.saveAttendance.call(context);
    assert.deepEqual(calls[1].presentStudents, []);
    assert.equal(calls[1].branchCode, 'female');
    assert.equal(context.isSavingAttendance, false);
  });

  test(`${name} attendance reports failed saves without claiming success`, async () => {
    const errors = [];
    const context = {
      students: [], attendanceChecked: [], managedBranchId: 'male',
      effectiveAttendanceBranchId: 'male', selectedCourseId: 'course', attendanceCourseId: 'course',
      setManualAttendance: async () => { throw new Error('offline'); },
      $toast: { error: (message) => errors.push(message) },
    };
    await methods.saveAttendance.call(context);
    assert.equal(context.saveStatusText, 'تعذر حفظ التحضير');
    assert.equal(context.isSavingAttendance, false);
    assert.equal(errors.length, 1);
  });

  test(`${name} manual attendance can save an open or closed session but blocks while loading`, async () => {
    const calls = [];
    const context = {
      students: [], attendanceChecked: [], managedBranchId: 'male', effectiveAttendanceBranchId: 'male',
      selectedCourseId: 'course', attendanceCourseId: 'course',
      selectedAttendanceSession: { id: 'session', isOpen: true },
      setManualAttendance: async payload => calls.push(payload),
      $toast: { error: message => assert.fail(message) },
    };
    await methods.saveAttendance.call(context);
    assert.equal(calls[0].sessionId, 'session');
    context.selectedAttendanceSession.isOpen = false;
    await methods.saveAttendance.call(context);
    context.selectedAttendanceSession = { loading: true };
    await methods.saveAttendance.call(context);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].sessionId, 'session');
  });

  test(`${name} supervisor can undo and restore attendance with explicit branch-scoped removals`, async () => {
    const calls = [];
    const context = {
      students: [{ id: 'm', loginId: 'male', name: 'Male', branchId: 'male' },
        { id: 'f', loginId: 'female', name: 'Female', branchId: 'female' }],
      attendanceChecked: ['m', 'f'], attendanceRemovedIds: [],
      managedBranchId: 'male', effectiveAttendanceBranchId: 'male',
      selectedCourseId: 'course', attendanceCourseId: 'course',
      selectedAttendanceSession: { id: 'session', isOpen: true }, queueAttendanceSave() {},
      setManualAttendance: async payload => calls.push(payload), $toast: { error: message => assert.fail(message) },
    };
    methods.toggleAttendance.call(context, 'm');
    assert.deepEqual(context.attendanceChecked, ['f']);
    assert.deepEqual(context.attendanceRemovedIds, ['m']);
    await methods.saveAttendance.call(context);
    assert.deepEqual(calls[0].removedStudents, ['male']);
    assert.deepEqual(calls[0].presentStudents, []);
    assert.deepEqual(context.attendanceRemovedIds, []);
    methods.toggleAttendance.call(context, 'm');
    await methods.saveAttendance.call(context);
    assert.deepEqual(calls[1].removedStudents, []);
    assert.deepEqual(calls[1].presentStudents, [{ loginId: 'male', studentName: 'Male', studentId: 'm' }]);
  });

  test(`${name} explicit cancellation remains available after closing self attendance but blocks while loading`, () => {
    const context = {
      attendanceStudents: [{ id: 'm' }, { id: 'n' }], attendanceChecked: ['m', 'n'],
      attendanceRemovedIds: [], allVisibleChecked: true,
      selectedAttendanceSession: { id: 'session', isOpen: true }, queueAttendanceSave() {},
    };
    methods.toggleVisibleAttendance.call(context);
    assert.deepEqual(context.attendanceChecked, []);
    assert.deepEqual(context.attendanceRemovedIds, ['m', 'n']);
    context.allVisibleChecked = false;
    methods.toggleVisibleAttendance.call(context);
    assert.deepEqual(context.attendanceChecked, ['m', 'n']);
    assert.deepEqual(context.attendanceRemovedIds, []);
    context.selectedAttendanceSession.isOpen = false;
    methods.toggleAttendance.call(context, 'm');
    assert.deepEqual(context.attendanceChecked, ['n']);
    methods.toggleVisibleAttendance.call(context);
    assert.deepEqual(context.attendanceChecked, ['n', 'm']);
    context.selectedAttendanceSession = { loading: true };
    methods.toggleAttendance.call(context, 'm');
    methods.toggleVisibleAttendance.call(context);
    assert.deepEqual(context.attendanceChecked, ['n', 'm']);
  });
}
