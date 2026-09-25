import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAssessmentSubmissionFormData } from '../src/services/multipartPayload.mjs';

test('assessment submissions use multipart files instead of Base64 payloads', () => {
  const file = new File(['safe'], 'answer.txt', { type: 'text/plain' });
  const formData = buildAssessmentSubmissionFormData({
    courseId: 'course-1',
    assessmentType: 'tasks',
    studentName: 'Student',
    loginId: 'student-1',
    answers: [{
      questionId: 'question-1',
      value: 'answer',
      fileName: 'answer.txt',
      fileType: 'text/plain',
      file,
      fileDataUrl: 'data:text/plain;base64,c2FmZQ==',
    }],
  }, ['courseId', 'assessmentType', 'studentName', 'loginId']);

  assert.equal(formData.get('courseId'), 'course-1');
  assert.equal(formData.get('answers[0][questionId]'), 'question-1');
  assert.equal(formData.get('answers[0][file]').name, 'answer.txt');
  assert.equal(formData.has('answers[0][fileDataUrl]'), false);
});
