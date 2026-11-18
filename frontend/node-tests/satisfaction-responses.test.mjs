import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSatisfactionRespondents, filterSatisfactionRespondents } from '../src/features/satisfaction/satisfactionResponseModel.mjs';

const response = overrides => ({
  id: 'response', courseId: 'course', questionId: 'rating', loginCode: '0012', studentName: 'اسم سابق',
  ratingValue: 8, textValue: '', submittedAt: '2025-01-02 10:00:00', ...overrides,
});
const questions = [
  { id: 'text', courseId: 'course', prompt: 'ملاحظاتك', sortOrder: 1 },
  { id: 'rating', courseId: 'course', prompt: 'تقييم الدورة', sortOrder: 0 },
];

test('existing ratings, multiline comments and deleted question prompts stay attached to the right person', () => {
  const people = buildSatisfactionRespondents({ courseId: 'course', questions,
    students: [{ loginId: '0012', name: 'الاسم الحالي' }],
    responses: [response({}), response({ id: 'comment', questionId: 'text', ratingValue: null, textValue: 'ملاحظة أولى\nملاحظة ثانية' }),
      response({ id: 'historical', questionId: 'deleted', questionPrompt: 'سؤال حُذف لاحقًا', ratingValue: 6, textValue: 'تعليق محفوظ مع التقييم' }),
      response({ id: 'foreign-course', courseId: 'other' })] });
  assert.equal(people.length, 1);
  assert.equal(people[0].name, 'الاسم الحالي');
  assert.equal(people[0].loginCode, '0012');
  assert.equal(people[0].answerCount, 3);
  assert.equal(people[0].submittedAt, '2025-01-02T10:00:00.000Z');
  assert.deepEqual(people[0].answers.map(answer => answer.prompt), ['تقييم الدورة', 'ملاحظاتك', 'سؤال حُذف لاحقًا']);
  assert.equal(people[0].answers[1].textValue, 'ملاحظة أولى\nملاحظة ثانية');
  assert.equal(people[0].answers[2].textValue, 'تعليق محفوظ مع التقييم');
});

test('identical names do not merge different login codes, and removed people retain their saved names', () => {
  const people = buildSatisfactionRespondents({ courseId: 'course', responses: [
    response({ studentName: 'محمد أحمد' }),
    response({ id: 'other', loginCode: '0013', studentName: 'محمد أحمد', submittedAt: '2025-02-02T10:00:00Z' }),
    response({ id: 'old', loginCode: 'old', studentName: 'حساب سابق', submittedAt: '2024-01-01T10:00:00Z' }),
  ] });
  assert.deepEqual(people.map(person => person.loginCode), ['0013', '0012', 'old']);
  assert.equal(people[2].name, 'حساب سابق');
  assert.equal(people[0].answers.length, 1);
});

test('a newer saved answer replaces its old duplicate without losing the only available saved name', () => {
  const people = buildSatisfactionRespondents({ courseId: 'course', responses: [
    response({ id: 'new', studentName: '', ratingValue: 10, submittedAt: '2026-01-01T10:00:00+03:00' }),
    response({ id: 'old', studentName: 'اسم محفوظ', ratingValue: 4 }),
  ] });
  assert.equal(people[0].name, 'اسم محفوظ');
  assert.equal(people[0].answerCount, 1);
  assert.equal(people[0].answers[0].ratingValue, 10);
  assert.equal(people[0].submittedAt, '2026-01-01T07:00:00.000Z');
});

test('missing values never become invented ratings and unidentified people are not grouped by name', () => {
  const people = buildSatisfactionRespondents({ courseId: 'course', students: [{ loginId: '', name: 'حساب غير مرتبط' }], responses: [
    response({ id: 'unknown-a', loginCode: '', studentName: '', ratingValue: null, textValue: ' ', submittedAt: 'invalid' }),
    response({ id: 'unknown-b', loginCode: '', studentName: '', ratingValue: '', textValue: '<script>unsafe text</script>' }),
    response({ id: 'zero', loginCode: 'zero', ratingValue: 0 }),
  ] });
  assert.equal(people.length, 3);
  const empty = people.find(person => person.key === 'unknown:unknown-a');
  assert.equal(empty.submittedAt, '');
  assert.equal(empty.answers[0].ratingValue, null);
  assert.equal(empty.answerCount, 0);
  assert.equal(empty.name, 'اسم غير متوفر');
  assert.equal(people.find(person => person.loginCode === 'zero').answers[0].ratingValue, 0);
  assert.equal(people.find(person => person.key === 'unknown:unknown-b').answers[0].textValue, '<script>unsafe text</script>');
});

test('search finds names and Arabic, Persian and Western login digits while preserving leading zeros', () => {
  const people = buildSatisfactionRespondents({ courseId: 'course', responses: [response({ studentName: 'محمد المختار' })] });
  for (const query of [' محمد ', '٠٠١٢', '۰۰۱۲', '0012']) assert.equal(filterSatisfactionRespondents(people, query).length, 1);
  assert.equal(filterSatisfactionRespondents(people, 'لا يوجد').length, 0);
  assert.equal(filterSatisfactionRespondents(people, null).length, 1);
});

test('more than one snapshot page of historical people remains searchable without truncation', () => {
  const responses = Array.from({ length: 1002 }, (_, index) => response({ id: String(index), loginCode: `old-${index}`, studentName: `مشارك ${index}` }));
  const people = buildSatisfactionRespondents({ courseId: 'course', responses });
  assert.equal(people.length, 1002);
  assert.equal(filterSatisfactionRespondents(people, 'old-1001')[0].name, 'مشارك 1001');
});
