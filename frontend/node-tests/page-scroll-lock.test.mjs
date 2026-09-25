import test from 'node:test';
import assert from 'node:assert/strict';
import { lockPageScroll } from '../src/utils/pageScrollLock.js';

test('nested overlays preserve background position until the final close and restore existing styles', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const style = {
    position: 'relative', top: '7px', left: '', right: '', width: '80%', overflow: 'auto', color: 'red',
    getPropertyValue(name) { return this[name] || ''; },
    getPropertyPriority() { return ''; },
    setProperty(name, value) { this[name] = value; },
    removeProperty(name) { delete this[name]; },
  };
  const scrolls = [];
  globalThis.document = { body: { style }, documentElement: { style: { overflow: 'scroll', scrollBehavior: 'smooth' } } };
  globalThis.window = { scrollX: 0, scrollY: 350, scrollTo: (x, y) => scrolls.push([x, y]) };
  try {
    const closeMenu = lockPageScroll();
    const closeDialog = lockPageScroll();
    closeMenu(); closeMenu();
    assert.equal(style.position, 'fixed');
    assert.deepEqual(scrolls, []);
    closeDialog(); closeDialog();
    assert.equal(style.position, 'relative');
    assert.equal(style.width, '80%');
    assert.equal(style.top, '7px');
    assert.equal(style.color, 'red');
    assert.equal(document.documentElement.style.overflow, 'scroll');
    assert.equal(document.documentElement.style.scrollBehavior, 'smooth');
    assert.deepEqual(scrolls, [[0, 350]]);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
