import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOuoAAAAASUVORK5CYII=';

test('real typing and native copy keep the caret and do not split each letter into a line', async ({ page, context }) => {
  const { editor, save, select, errors } = await openDocument(page, context, 'ثبات الكتابة والنسخ');
  const text = 'كتابة عربية متصلة وواضحة';
  await editor.click();
  await editor.pressSequentially(text, { delay: 45 });
  await expect(editor.locator('p')).toHaveText([text]);
  await editor.press('ControlOrMeta+Home');
  await editor.press('ControlOrMeta+Shift+End');
  await editor.press('ControlOrMeta+c');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await editor.press('ControlOrMeta+v');
  await expect(editor.locator('p')).toHaveText([text, text]);
  await editor.pressSequentially(' وتكملة بعد اللصق', { delay: 45 });
  await expect(editor.locator('p')).toHaveText([text, `${text} وتكملة بعد اللصق`]);
  await save();
  await select();
  await expect(editor.locator('p')).toHaveText([text, `${text} وتكملة بعد اللصق`]);
  expect(errors).toEqual([]);
});

async function paste(editor, { text = '', html = '', uri = '', image = false } = {}) {
  await editor.evaluate((element, data) => {
    const clipboard = new DataTransfer();
    if (data.text) clipboard.setData('text/plain', data.text);
    if (data.html) clipboard.setData('text/html', data.html);
    if (data.uri) clipboard.setData('text/uri-list', data.uri);
    if (data.image) clipboard.items.add(new File([
      Uint8Array.from(atob(data.png), (char) => char.charCodeAt(0)),
    ], 'clipboard.png', { type: 'image/png' }));
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  }, { text, html, uri, image, png });
}

test('composed Arabic input remains one line after images and formatted paste', async ({ page, context }) => {
  const { editor, save, select, errors } = await openDocument(page, context, 'إدخال الحروف المركبة');
  await editor.click();
  await paste(editor, { html: `<p><img src="data:image/png;base64,${png}"></p><p><strong>بداية</strong></p>` });
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  const client = await context.newCDPSession(page);
  const text = 'كتابة عربية متصلة';
  for (let end = 1; end <= text.length; end += 1) {
    await client.send('Input.imeSetComposition', { text: text.slice(0, end), selectionStart: end, selectionEnd: end });
  }
  await client.send('Input.insertText', { text });
  await expect(editor.locator('p').last()).toHaveText(text);
  await editor.pressSequentially(' ونص إضافي', { delay: 45 });
  await expect(editor.locator('p').last()).toHaveText(`${text} ونص إضافي`);
  await expect(editor.locator('img')).toHaveCount(1);
  await save();
  await select();
  await expect(editor.locator('p').last()).toHaveText(`${text} ونص إضافي`);
  expect(errors).toEqual([]);
});

async function openDocument(page, context, title) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const api = async (method, route, data) => {
    const cookie = (await context.cookies(origin)).find((item) => item.name === 'XSRF-TOKEN');
    const response = await page.request.fetch(`${origin}/api${route}`, { method, data,
      headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') } });
    expect(response.ok(), `${method} ${route}: ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
  const task = await api('POST', '/dashboard/courses', { title, entityType: 'task', taskMode: 'document', isActive: false });
  const select = async () => {
    await page.goto('dashboard?panel=tasks');
    await page.locator('.assessment-select:visible').first().locator('.v-field').click();
    await selectOption(page, title, { exact: true });
    await expect(page.locator('.ql-editor')).toBeVisible();
  };
  await select();
  const save = async () => {
    const saved = page.waitForResponse((response) => response.url().endsWith(`/courses/${task.id}/questions/sync`)
      && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText('تم حفظ إعدادات المهمة بنجاح', { exact: true })).toBeVisible();
  };
  return { api, task, select, save, errors, editor: page.locator('.ql-editor') };
}

test('clipboard keeps complete Arabic text, Word formatting, replacement, undo and saved tables', async ({ page, context }) => {
  const { editor, select, save, errors } = await openDocument(page, context, 'سلامة لصق المستند');
  const full = 'هذا النص العربي الكامل المنسوخ مع الحركات والأرقام ١٢٣ ABC';
  for (const html of ['<p>ه</p>', '<p>&nbsp;</p>', '<p><br></p>', '<img src="file:///word/image.png">']) {
    await editor.fill('النص السابق');
    await editor.press('ControlOrMeta+A');
    await paste(editor, { text: full, html });
    await expect(editor).toHaveText(full);
  }
  await editor.fill('سابق');
  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: full });
  await editor.press('ControlOrMeta+Z');
  await expect(editor).toHaveText('سابق');
  await editor.press('ControlOrMeta+Shift+Z');
  await expect(editor).toHaveText(full);

  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: 'عنوان عربي\nفقرة ثانية', html: '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style>.MsoNormal { color:red; }</style></head><body><p class="MsoNormal" dir="rtl"><b>عنوان عربي</b></p><p><i>فقرة ثانية</i></p></body></html>' });
  await expect(editor.locator('strong')).toHaveText('عنوان عربي');
  await expect(editor.locator('em')).toHaveText('فقرة ثانية');
  await expect(editor).not.toContainText('MsoNormal');
  await paste(editor, { text: ' ملحق' });
  await paste(editor, { text: ' أخير' });
  await expect(editor).toContainText('فقرة ثانية ملحق أخير');

  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: 'أول\nثان', html: '<html xmlns:w="urn:schemas-microsoft-com:office:word"><body><p style="mso-list:l0 level1"><span style="mso-list:Ignore">1. </span>أول</p><p style="mso-list:l0 level1"><span style="mso-list:Ignore">2. </span>ثان</p></body></html>' });
  await expect(editor.locator('li')).toHaveCount(2);
  await expect(editor.locator('li').first()).toHaveAttribute('data-list', 'ordered');
  await expect(editor.locator('li').first()).toHaveText('أول');
  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: 'صف أول\tقيمة أولى\nصف ثان\tقيمة ثانية', html: '<table><tr><td>صف أول</td><td>قيمة أولى</td></tr><tr><td>صف ثان</td><td>قيمة ثانية</td></tr></table>' });
  await expect(editor.locator('table')).toHaveCount(1);
  await expect(editor.locator('td')).toHaveText(['صف أول', 'قيمة أولى', 'صف ثان', 'قيمة ثانية']);
  expect((await editor.textContent()).match(/صف أول/g)).toHaveLength(1);
  await editor.locator('td').first().click();
  await paste(editor, { text: 'جدول داخلي', html: '<table><tr><td>جدول داخلي</td></tr></table>' });
  await expect(editor).toContainText('جدول داخلي');
  await expect(editor.locator('table table')).toHaveCount(0);
  await expect(editor.locator('table')).toHaveCount(1);
  await save();
  await select();
  await expect(editor).toContainText('جدول داخلي');
  await expect(editor.locator('td')).toHaveCount(4);

  await editor.press('ControlOrMeta+End');
  await editor.press('ArrowDown');
  await editor.press('Enter');
  const paragraphs = Array.from({ length: 100 }, (_, i) => `فقرة ${i}: هذا نص عربي طويل للتأكد من اكتمال اللصق دون اختصار.`);
  const longText = paragraphs.join('\n');
  const pastedParagraphs = async () => (await editor.innerText()).split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('فقرة '));
  await paste(editor, { text: longText, html: '<p> </p>' });
  await expect.poll(pastedParagraphs).toEqual(paragraphs);
  await save();
  await select();
  await expect.poll(pastedParagraphs).toEqual(paragraphs);
  expect(errors).toEqual([]);
});

test('image clipboard uploads once, preserves mixed text and saves the result', async ({ page, context }) => {
  const { editor, select, save, errors } = await openDocument(page, context, 'لصق النص مع الصور');
  let imageRequests = 0;
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/editor-images')) imageRequests += 1; });
  await editor.click();
  await paste(editor, { html: '<img src="file:///word/image.png">', image: true });
  await expect(editor.locator('img')).toHaveCount(1);
  await expect.poll(() => imageRequests).toBe(1);
  const originalImage = await editor.locator('img').getAttribute('src');
  await editor.press('ControlOrMeta+End');
  await paste(editor, { text: 'النص الكامل مع صورة مرافقة', html: '<p>النص الكامل مع صورة مرافقة</p>', image: true });
  await expect(editor).toContainText('النص الكامل مع صورة مرافقة');
  await expect(editor.locator('img')).toHaveCount(1);
  expect(imageRequests).toBe(1);
  await save();
  await select();
  await expect(editor.locator('img')).toHaveAttribute('src', originalImage);
  await expect(editor).toContainText('النص الكامل مع صورة مرافقة');
  expect(errors).toEqual([]);
});

test('student clipboard keeps locked template images while replacing text and submitting', async ({ page, context }, info) => {
  const { editor, api, task, errors } = await openDocument(page, context, 'صور قالب الطالب');
  const originalImage = `data:image/png;base64,${png}`;
  await api('PUT', `/dashboard/courses/${task.id}`, {
    taskTemplateContent: `<p><img src="${originalImage}"></p><p>قالب محفوظ للطالب</p>`,
    isTasksEnabled: true,
  });
  let imageRequests = 0;
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/editor-images')) imageRequests += 1; });
  const loginId = `87${String(info.project.use.viewport.width).padStart(8, '0')}`;
  await api('POST', '/students', { name: 'طالب اختبار اللصق', loginId, branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword });
  await page.goto('about:blank');
  await context.clearCookies();
  await login(page, loginId, studentPassword);
  await page.goto(`tasks?taskId=${task.id}`);
  await expect(editor.locator('img')).toHaveAttribute('src', originalImage);
  await editor.press('ControlOrMeta+A');
  await editor.press('Backspace');
  await expect(editor.locator('img')).toHaveAttribute('src', originalImage);
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await paste(editor, { text: 'إجابة الطالب كاملة', html: `<p>إجابة الطالب كاملة<img src="data:image/png;base64,${png}"></p>`, image: true });
  await expect(editor).toContainText('إجابة الطالب كاملة');
  await expect(editor.locator('img')).toHaveCount(1);
  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially(' وكتابة متصلة بعد اللصق', { delay: 45 });
  await expect(editor).toContainText('إجابة الطالب كاملة وكتابة متصلة بعد اللصق');
  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: 'استبدال النص مع إبقاء صورة القالب' });
  await expect(editor).toContainText('استبدال النص مع إبقاء صورة القالب');
  await expect(editor.locator('img')).toHaveAttribute('src', originalImage);
  await paste(editor, { image: true });
  await expect(editor.locator('img')).toHaveCount(1);
  expect(imageRequests).toBe(0);
  const sent = page.waitForResponse((response) => response.url().endsWith('/public/assessment-submissions') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'إرسال', exact: true }).click();
  expect((await sent).status()).toBe(201);
  await page.reload();
  await expect(page.getByText('تم الإرسال', { exact: true })).toBeVisible();
  const submission = (await api('GET', '/public/snapshot')).submissions.find((item) => item.courseId === task.id);
  expect(submission.answers[0].value).toContain('استبدال النص مع إبقاء صورة القالب');
  expect(submission.answers[0].value).toContain(originalImage.replaceAll('&', '&amp;'));
  expect(errors).toEqual([]);
});

test('native browser clipboard pastes full content and unsafe or empty HTML cannot erase it', async ({ page, context }) => {
  const { editor, errors } = await openDocument(page, context, 'الحافظة الأصلية');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await editor.click();
  await page.evaluate(async () => navigator.clipboard.write([new ClipboardItem({
    'text/plain': new Blob(['نص كامل من الحافظة الأصلية'], { type: 'text/plain' }),
    'text/html': new Blob(['<p>ن</p>'], { type: 'text/html' }),
  })]));
  await editor.press('ControlOrMeta+V');
  await expect(editor).toHaveText('نص كامل من الحافظة الأصلية');
  await editor.press('ControlOrMeta+A');
  await paste(editor);
  await expect(editor).toHaveText('نص كامل من الحافظة الأصلية');
  await paste(editor, { text: 'نص آمن', html: '<style>CSS_LEAK</style><script>window.__pasteXss = true</script><iframe srcdoc="unsafe">IFRAME_LEAK</iframe><p onclick="window.__pasteXss=true"><b>نص آمن</b><img src=x onerror="window.__pasteXss=true"></p>' });
  await expect(editor).toHaveText('نص آمن');
  await expect(editor.locator('strong')).toHaveText('نص آمن');
  await expect(editor.locator('script,style,iframe,[onclick],[onerror],img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__pasteXss)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('clipboard preserves literal numbering, HTML labels and Word list types through save and reload', async ({ page, context }) => {
  const { editor, select, save, errors } = await openDocument(page, context, 'قوائم الحافظة');
  await editor.click();
  await paste(editor, { text: '1. نص كامل', html: '<p>نص كامل</p>' });
  await expect(editor).toHaveText('1. نص كامل');
  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: '1. ', image: true });
  await expect(editor).toHaveText('1.');
  await expect(editor.locator('img')).toHaveCount(0);
  await editor.press('ControlOrMeta+A');
  await paste(editor, { html: '<p><b>عنوان الرابط</b></p>', uri: 'https://example.com' });
  await expect(editor.locator('strong')).toHaveText('عنوان الرابط');
  await editor.press('ControlOrMeta+A');
  await paste(editor, { uri: '# comment\r\nhttps://example.com/one\r\nhttps://example.com/two' });
  await expect(editor).toHaveText('https://example.com/onehttps://example.com/two');
  await editor.press('ControlOrMeta+A');
  await paste(editor, {
    text: '1. قائمة مرقمة\n• قائمة نقطية',
    html: '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style>@list l0:level1 { mso-level-number-format:decimal; } @list l1:level1 { mso-level-number-format:bullet; }</style></head><body><p style="mso-list:l0 level1"><span style="mso-list:Ignore">1. </span>قائمة مرقمة</p><p style="mso-list:l1 level1"><span style="mso-list:Ignore">• </span>قائمة نقطية</p></body></html>',
  });
  const expectLists = async () => {
    await expect(editor.locator('li')).toHaveText(['قائمة مرقمة', 'قائمة نقطية']);
    await expect(editor.locator('li').first()).toHaveAttribute('data-list', 'ordered');
    await expect(editor.locator('li').last()).toHaveAttribute('data-list', 'bullet');
    await expect(editor).not.toContainText('mso-level');
  };
  await expectLists();
  await editor.press('ControlOrMeta+A');
  await paste(editor, { text: 'قائمة جديدة\nعنصر جديد', html: '<ul><li>قائمة جديدة</li><li>عنصر جديد</li></ul>' });
  await expect(editor.locator('li')).toHaveText(['قائمة جديدة', 'عنصر جديد']);
  await editor.press('ControlOrMeta+z');
  await expectLists();
  await save();
  await select();
  await expectLists();
  expect(errors).toEqual([]);
});
