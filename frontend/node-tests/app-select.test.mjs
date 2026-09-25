import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSelectItemSlotProps } from '../src/components/ui/selectSlotProps.mjs';

test('shared selects expose Vuetify 3 items through the application slot contract', () => {
  const raw = { label: 'مهمة أدائية', value: 'task-1' };
  const click = () => {};
  const normalized = normalizeSelectItemSlotProps({
    item: { title: raw.label, value: raw.value, raw },
    props: { onClick: click, role: 'option' },
  });

  assert.equal(normalized.item, raw);
  assert.equal(normalized.attrs.onClick, click);
  assert.equal(normalized.attrs.role, 'option');
  assert.deepEqual(normalized.on, {});
});
