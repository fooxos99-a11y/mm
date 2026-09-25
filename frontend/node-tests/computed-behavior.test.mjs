import assert from 'node:assert/strict';
import test from 'node:test';
import dashboardAccess from '../src/features/dashboard/dashboardAccessComputed.js';
import dashboardSatisfaction from '../src/features/dashboard/dashboardSatisfactionComputed.js';
import peopleAccess from '../src/features/people/adminPeopleAccessComputed.js';
import peopleForms from '../src/features/people/adminPeopleFormComputed.js';
import peopleRecords from '../src/features/people/adminPeopleRecordsComputed.js';

test('manager dashboards expose only panels granted by the role policy', () => {
  const context = {
    currentUser: { role: 'male_manager' },
    canAccessPanel: (panel) => ['overview', 'courses', 'results'].includes(panel),
  };

  context.managedBranchId = dashboardAccess.managedBranchId.call(context);
  const menu = dashboardAccess.dashboardMenu.call(context);

  assert.equal(context.managedBranchId, 'male');
  assert.deepEqual(menu.map((item) => item.id), ['overview', 'courses', 'results']);
});

test('satisfaction indicators ignore text responses and invalid ratings', () => {
  const context = {
    selectedSatisfactionQuestions: [
      { id: 'rating', prompt: 'التقييم', type: 'rating' },
      { id: 'note', prompt: 'الملاحظة', type: 'text' },
    ],
    selectedSatisfactionResponses: [
      { questionId: 'rating', ratingValue: 8 },
      { questionId: 'rating', ratingValue: '6' },
      { questionId: 'rating', ratingValue: 'غير صالح' },
      { questionId: 'note', ratingValue: 10 },
    ],
  };

  assert.deepEqual(dashboardSatisfaction.satisfactionRatingIndicators.call(context), [{
    id: 'rating',
    label: 'التقييم',
    count: 2,
    average: 7,
    progress: 70,
    display: '7.0',
  }]);
});

test('people options respect the active branch and Arabic sorting', () => {
  const context = {
    manageEntityType: 'student',
    manageBranchId: 'male',
    students: [
      { id: '2', name: 'بدر', branchId: 'male', loginId: '102' },
      { id: '1', name: 'أحمد', branchId: 'male', loginId: '101' },
      { id: '3', name: 'نورة', branchId: 'female', loginId: '103' },
    ],
    reciters: [],
  };

  assert.deepEqual(peopleRecords.manageTargetOptions.call(context), [
    { label: 'أحمد - 101', value: '1' },
    { label: 'بدر - 102', value: '2' },
  ]);
});

test('person editor fields write to the form selected by the entity type', () => {
  const context = {
    dialogEntityType: 'reciter',
    studentForm: { name: 'طالب' },
    reciterForm: { name: 'مقرئ' },
  };

  assert.equal(peopleForms.activeName.get.call(context), 'مقرئ');
  peopleForms.activeName.set.call(context, 'مقرئ جديد');
  assert.equal(context.reciterForm.name, 'مقرئ جديد');
  assert.equal(context.studentForm.name, 'طالب');
});

test('people branch access follows the signed-in manager role', () => {
  const context = { currentUser: { role: 'female_manager' } };
  assert.equal(peopleAccess.managedBranchId.call(context), 'female');
});
