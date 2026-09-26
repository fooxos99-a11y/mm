import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_FIXED_FIELD_LABELS,
  FIXED_FIELD_DEFINITIONS,
  createRegistrationFieldId,
  normalizeFixedFieldLabels,
} from '../src/features/registration/registrationFieldLabels.mjs';

test('fixed registration labels can be renamed while blanks fall back to defaults', () => {
  assert.deepEqual(normalizeFixedFieldLabels(), DEFAULT_FIXED_FIELD_LABELS);
  assert.deepEqual(normalizeFixedFieldLabels(null), DEFAULT_FIXED_FIELD_LABELS);
  assert.deepEqual(
    normalizeFixedFieldLabels({ name: '  الاسم الثلاثي ', gender: '   ', phone: 'جوال التواصل', extra: 'x' }),
    { name: 'الاسم الثلاثي', gender: 'الجنس', phone: 'جوال التواصل' },
  );
});

test('fixed registration field types are locked', () => {
  assert.deepEqual(
    FIXED_FIELD_DEFINITIONS.map(({ id, type }) => `${id}:${type}`),
    ['name:text', 'gender:select', 'phone:number'],
  );
  assert.ok(Object.isFrozen(FIXED_FIELD_DEFINITIONS[0]));
});

test('new registration field ids use the Web Crypto API', () => {
  assert.equal(createRegistrationFieldId({ randomUUID: () => 'abc' }), 'field-abc');
  assert.equal(
    createRegistrationFieldId({ getRandomValues: (bytes) => bytes.fill(10) }),
    `field-${'0a'.repeat(16)}`,
  );
  assert.match(createRegistrationFieldId(), /^field-[0-9a-f-]{32,36}$/);
});
