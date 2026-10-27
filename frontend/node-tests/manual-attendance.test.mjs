import assert from 'node:assert/strict';
import test from 'node:test';
import assessmentMethods from '../src/features/assessment/assessmentAttendanceMethods.js';
import resultsMethods from '../src/features/results/adminResultsDataMethods.js';

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

  test(`${name} session attendance uses the selected session and cannot save a closed or loading session`, async () => {
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
    assert.equal(calls.length, 1);
  });

  test(`${name} supervisor can undo and restore attendance with explicit branch-scoped removals`, async () => {
    const calls = [];
    const context = {
      students: [{ id: 'm', loginId: 'male', name: 'Male', branchId: 'male' },
        { id: 'f', loginId: 'female', name: 'Female', branchId: 'female' }],
      attendanceChecked: ['m', 'f'], attendanceRemovedIds: [], attendanceEnrollmentIds: ['m', 'f'],
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

  test(`${name} cancelling all tracks each explicit cancellation and a closed session rejects toggles`, () => {
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
    methods.toggleVisibleAttendance.call(context);
    assert.deepEqual(context.attendanceChecked, ['m', 'n']);
  });
}
