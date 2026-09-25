import assert from 'node:assert/strict';
import test from 'node:test';
import assessmentAttendanceMethods from '../src/features/assessment/assessmentAttendanceMethods.js';
import assessmentCourseDialogMethods from '../src/features/assessment/assessmentCourseDialogMethods.js';
import assessmentManageDialogMethods from '../src/features/assessment/assessmentManageDialogMethods.js';
import assessmentActionsComputed from '../src/features/assessment/adminAssessmentActionsComputed.js';
import assessmentQuestionFormMethods from '../src/features/assessment/assessmentQuestionFormMethods.js';
import { buildProgramIndicators } from '../src/utils/programIndicators.js';

test('assessment management choices reflect the active branches', () => {
  const context = {
    isAssessmentBranchActive: (course, type, branch) => Boolean(course[branch]?.[type]),
  };
  const course = {
    male: { pre: true },
    female: { pre: false },
  };

  assert.deepEqual(
    assessmentManageDialogMethods.getAssessmentManageOptions.call(context, course, 'pre'),
    [
      { value: 'close_male', label: 'إغلاق معلمين' },
      { value: 'open_female', label: 'فتح معلمات' },
      { value: 'open_all', label: 'فتح الكل' },
    ],
  );
});

test('assessment action type follows task and embedded contexts', () => {
  assert.equal(assessmentManageDialogMethods.resolveActionAssessmentType.call({ isTasksPage: true }, 'pre'), 'tasks');
  assert.equal(assessmentManageDialogMethods.resolveActionAssessmentType.call({
    isTasksPage: false,
    embedded: true,
    currentAssessmentActionType: 'post',
  }, 'pre'), 'post');
  assert.equal(assessmentManageDialogMethods.resolveActionAssessmentType.call({
    isTasksPage: false,
    embedded: false,
    assessmentType: 'pre',
  }, 'invalid'), 'pre');
});

test('visible attendance toggling preserves hidden selections', () => {
  let queued = 0;
  const context = {
    attendanceStudents: [{ id: 'visible-a' }, { id: 'visible-b' }],
    attendanceChecked: ['hidden', 'visible-a'],
    allVisibleChecked: false,
    queueAttendanceSave: () => { queued += 1; },
  };

  assessmentAttendanceMethods.toggleVisibleAttendance.call(context);

  assert.deepEqual(context.attendanceChecked, ['hidden', 'visible-a', 'visible-b']);
  assert.equal(queued, 1);
});

test('course deletion resets selection and dialog state after success', async () => {
  const deleted = [];
  const context = {
    courseDeleteId: 'course-1',
    selectedCourseId: 'course-1',
    courseEditId: 'course-1',
    isTasksPage: false,
    deleteCourse: async (courseId) => { deleted.push(courseId); },
    closeQuestionDetails() { this.selectedCourseId = ''; },
    closeCourseEditDialog() { this.courseEditId = ''; },
    closeCourseDeleteDialog() { this.courseDeleteId = ''; },
    $toast: { success: () => {}, error: () => assert.fail('unexpected deletion error') },
  };

  await assessmentCourseDialogMethods.confirmManagedCourseDelete.call(context);

  assert.deepEqual(deleted, ['course-1']);
  assert.equal(context.selectedCourseId, '');
  assert.equal(context.courseEditId, '');
  assert.equal(context.courseDeleteId, '');
  assert.equal(context.deletingCourseId, '');
  assert.equal(context.assessmentDeleteSubmitting, false);
});

test('manager assessment permissions distinguish editing opening and attendance', () => {
  const context = {
    currentUser: { role: 'male_manager' },
    dashboardSnapshot: {
      rolePermissions: {
        male_manager: { edit_tasks: true, open_pre_exam: true, page_results: false },
      },
    },
    isTasksPage: true,
    detailAssessmentType: 'tasks',
    currentAssessmentActionType: 'tasks',
  };

  context.rolePermissions = assessmentActionsComputed.rolePermissions.call(context);
  assert.equal(assessmentActionsComputed.canEditQuestions.call(context), true);
  assert.equal(assessmentActionsComputed.canOpenAssessment.call(context), true);
  assert.equal(assessmentActionsComputed.canEditAttendance.call(context), false);
});

test('task-wide points only update document tasks', () => {
  const context = {
    isTasksPage: true,
    isDocumentMode: false,
    questionForms: [{ points: '2' }],
    questionDrafts: { question: { points: '3' } },
    visibleSelectedQuestions: [{ id: 'question' }],
  };

  assessmentQuestionFormMethods.handleTaskPointsInput.call(context, '9');
  assert.equal(context.taskPointsDraft, '9');
  assert.equal(context.questionForms[0].points, '2');
  assert.equal(context.questionDrafts.question.points, '3');
});

test('overview count rings reflect real completion instead of always appearing complete', () => {
  const indicators = buildProgramIndicators({
    students: [{ id: 'student', branchId: 'male', loginId: '100', completedParts: [1, 2, 3] }],
  });

  assert.equal(indicators.find((item) => item.key === 'memorization').progress, 10);
  assert.equal(indicators.find((item) => item.key === 'completed30').progress, 0);
  assert.equal(indicators.find((item) => item.key === 'memorization').meta, '3 من 30');
});
