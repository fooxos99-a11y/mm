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
}
