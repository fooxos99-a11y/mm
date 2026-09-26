// Labels for the built-in registration fields. Admins may rename them,
// but their input type (text, gender list, 10-digit phone) never changes.
export const DEFAULT_FIXED_FIELD_LABELS = Object.freeze({
  name: 'الاسم',
  gender: 'الجنس',
  phone: 'رقم الجوال',
});

export const FIXED_FIELD_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'name', type: 'text' }),
  Object.freeze({ id: 'gender', type: 'select' }),
  Object.freeze({ id: 'phone', type: 'number' }),
]);

export const normalizeFixedFieldLabels = (labels = {}) => Object.fromEntries(
  Object.entries(DEFAULT_FIXED_FIELD_LABELS).map(([fieldId, defaultLabel]) => {
    const label = String(labels?.[fieldId] ?? '').trim();

    return [fieldId, label || defaultLabel];
  }),
);

export const createRegistrationFieldId = (cryptoApi = globalThis.crypto) => {
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `field-${cryptoApi.randomUUID()}`;
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);

  return `field-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};
