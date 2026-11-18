import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssessmentCourse } from '../src/features/course/assessmentCourse.mjs';

test('a retry opens its original inactive course and remains there after submission', () => {
  const active = { id: 'active', isActive: true };
  const original = { id: 'original', isActive: false, retryTypes: ['pre'] };
  const task = { id: 'task', entityType: 'task', retryTypes: ['pre'] };
  assert.equal(resolveAssessmentCourse([task, active, original], 'pre'), original);
  assert.equal(resolveAssessmentCourse([task, active, original], 'post'), active);
  const submitted = { ...original, retryTypes: [] };
  assert.equal(resolveAssessmentCourse([active, submitted], 'pre', 'original', [
    { courseId: 'original', assessmentType: 'pre' },
  ]), submitted);
  assert.equal(resolveAssessmentCourse([active, submitted], 'post', 'original', [
    { courseId: 'original', assessmentType: 'pre' },
  ]), active);
  assert.equal(resolveAssessmentCourse([active, submitted], 'pre', 'original'), active);
});
