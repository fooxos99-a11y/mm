import assert from 'node:assert/strict';
import test from 'node:test';

import {
  passwordConfirmationIsValid,
  passwordMeetsPolicy,
} from '../src/utils/passwordPolicy.mjs';

test('password policy requires ten characters with a letter and number', () => {
  assert.equal(passwordMeetsPolicy('short1'), false);
  assert.equal(passwordMeetsPolicy('abcdefghij'), false);
  assert.equal(passwordMeetsPolicy('1234567890'), false);
  assert.equal(passwordMeetsPolicy('كلمة-مرور-2026'), true);
});

test('password confirmation must match a policy-compliant password', () => {
  assert.equal(passwordConfirmationIsValid('Secure-pass-2026', 'Secure-pass-2026'), true);
  assert.equal(passwordConfirmationIsValid('Secure-pass-2026', 'different-2026'), false);
});
