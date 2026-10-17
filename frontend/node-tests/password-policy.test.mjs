import assert from 'node:assert/strict';
import test from 'node:test';

import {
  passwordConfirmationIsValid,
  passwordMeetsPolicy,
} from '../src/utils/passwordPolicy.mjs';

test('password policy accepts short numbers, letters and symbols without an eight-character restriction', () => {
  for (const password of ['0', '1', '12', 'a', 'ab', 'ع', 'سع', '!', 'a !', ' a ', '01234567', '٠١٢٣٤٥٦٧', '123456789', 'كلمة-مرور-2026', 'ع'.repeat(255)]) {
    assert.equal(passwordMeetsPolicy(password), true);
  }
  for (const password of [undefined, null, '', ' ', '\n', 'a'.repeat(256)]) {
    assert.equal(passwordMeetsPolicy(password), false);
  }
});

test('password confirmation must match a policy-compliant password', () => {
  assert.equal(passwordConfirmationIsValid('01234567', '01234567'), true);
  assert.equal(passwordConfirmationIsValid('01234567', '12345678'), false);
  assert.equal(passwordConfirmationIsValid('a', 'a'), true);
  assert.equal(passwordConfirmationIsValid('1', '2'), false);
  assert.equal(passwordConfirmationIsValid('', ''), false);
});
