import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTaskResource } from '../src/features/tasks/taskResource.mjs';

test('task resources preserve web links and reject unsafe or incomplete URLs', () => {
  for (const value of [undefined, '', '/relative', 'javascript:alert(1)', 'data:text/html,test', 'file:///video.mp4']) {
    assert.equal(resolveTaskResource(value), null);
  }
  for (const href of ['https://example.com/form?task=1#answer', 'http://example.com/lesson', 'https://notyoutube.com/watch?v=abcdefghijk']) {
    assert.deepEqual(resolveTaskResource(` ${href} `), { href, video: null });
  }
});

test('task resources retain video previews alongside the original link', () => {
  for (const path of ['watch?v=abcdefghijk', 'embed/abcdefghijk', 'shorts/abcdefghijk']) {
    assert.deepEqual(resolveTaskResource(`https://www.youtube.com/${path}`).video,
      { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0' });
  }
  assert.equal(resolveTaskResource('https://youtu.be/abcdefghijk').video.kind, 'embed');
  for (const value of ['https://youtu.be/', 'https://youtube.com/', 'https://youtube.com/watch', 'https://youtu.be/invalid']) {
    assert.equal(resolveTaskResource(value).video, null);
  }
  const href = 'https://example.com/lesson.MP4?download=1#start';
  assert.deepEqual(resolveTaskResource(href), { href, video: { kind: 'video', src: href } });
});
