import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProgramIndicators } from '../src/utils/programIndicators.js';

test('closed task responses remain in the correct branch and duplicate responses count once', () => {
  const students = [
    { loginId: 'm1', branchId: 'male' }, { loginId: 'm2', branchId: 'male' },
    { loginId: 'f1', branchId: 'female' },
  ];
  const courses = [
    { id: 'closed', entityType: 'task', isTasksEnabled: false, branchAvailability: { male: { tasks: false }, female: { tasks: false } } },
    { id: 'unopened', entityType: 'task', isTasksEnabled: false },
  ];
  const submissions = [
    { courseId: 'closed', assessmentType: 'tasks', loginId: 'm1' },
    { courseId: 'closed', assessmentType: 'tasks', loginId: 'm1' },
    { courseId: 'unopened', assessmentType: 'tasks', loginId: 'unrelated' },
  ];
  const indicator = (branchStudents = students) => buildProgramIndicators({ students: branchStudents, courses, submissions })
    .find(item => item.key === 'tasks');
  assert.equal(indicator().meta, '1 من 2');
  assert.equal(indicator().display, '50%');
  assert.equal(indicator(students.filter(student => student.branchId === 'female')).meta, '0 من 0');
  courses.push({ id: 'open', entityType: 'task', isTasksEnabled: true });
  submissions.push({ courseId: 'open', assessmentType: 'tasks', loginId: 'f1' });
  assert.equal(indicator().meta, '2 من 5');
  assert.equal(indicator(students.filter(student => student.branchId === 'male')).meta, '1 من 4');
});
