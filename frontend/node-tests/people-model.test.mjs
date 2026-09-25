import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BULK_LOGIN_HEADER_KEYS,
  BULK_NAME_HEADER_KEYS,
  BULK_PASSWORD_HEADER_KEYS,
  clampPercent,
  createEmptyReciterForm,
  createEmptyStudentForm,
  ratioPercent,
} from '../src/features/people/peopleModel.mjs'

test('people form factories return isolated mobile-ready defaults', () => {
  const first = createEmptyReciterForm()
  const second = createEmptyReciterForm()
  first.studentIds.push('student-1')

  assert.deepEqual(second.studentIds, [])
  assert.equal(createEmptyStudentForm().branchId, 'male')
  assert.equal(createEmptyStudentForm().passwordConfirmation, '')
})

test('people progress percentages are rounded and safely clamped', () => {
  assert.equal(clampPercent(101), 100)
  assert.equal(clampPercent(-4), 0)
  assert.equal(clampPercent('invalid'), 0)
  assert.equal(ratioPercent(1, 3), 33)
  assert.equal(ratioPercent(4, 0), 0)
})

test('bulk import header aliases include Arabic and English identifiers', () => {
  assert.ok(BULK_NAME_HEADER_KEYS.includes('الاسم'))
  assert.ok(BULK_LOGIN_HEADER_KEYS.includes('login code'))
  assert.ok(BULK_PASSWORD_HEADER_KEYS.includes('كلمة المرور'))
  assert.equal(Object.isFrozen(BULK_NAME_HEADER_KEYS), true)
})
