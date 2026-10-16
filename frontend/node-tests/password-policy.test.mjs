import assert from 'node:assert/strict';
import test from 'node:test';

import {
  passwordConfirmationIsValid,
  passwordMeetsPolicy,
} from '../src/utils/passwordPolicy.mjs';

test('password policy accepts exactly eight decimal digits including leading zeros', () => {
  for (const password of ['01234567', '87654321', '٠١٢٣٤٥٦٧']) {
    assert.equal(passwordMeetsPolicy(password), true);
  }
  for (const password of [undefined, '', '1234567', '123456789', 'abcd1234', 'abcdefgh', '1234 678', '1234567\n', '12345678\n', 'كلمة-مرور-2026']) {
    assert.equal(passwordMeetsPolicy(password), false);
  }
});

test('password confirmation must match a policy-compliant password', () => {
  assert.equal(passwordConfirmationIsValid('01234567', '01234567'), true);
  assert.equal(passwordConfirmationIsValid('01234567', '12345678'), false);
});
