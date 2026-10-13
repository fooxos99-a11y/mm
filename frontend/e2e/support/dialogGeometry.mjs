import { expect } from '@playwright/test';

export async function expectDialogContained(dialog) {
  await expect(dialog).toBeVisible();
  const issues = await dialog.evaluate(element => {
    const box = element.querySelector('.modal-box').getBoundingClientRect();
    const errors = [];
    if (box.left < -1 || box.right > innerWidth + 1) errors.push('dialog outside viewport');
    for (const node of element.querySelectorAll('.modal-box, .app-dialog, .app-dialog-body, .results-answer-card, input, button, h1, h2, h3, .app-dialog-header__title, .rich-text-document-view')) {
      if (!node.getClientRects().length) continue;
      const rect = node.getBoundingClientRect();
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || node.scrollWidth > node.clientWidth + 1) {
        errors.push(`${node.tagName}.${node.className}: overflow`);
      }
    }
    return errors;
  });
  expect(issues).toEqual([]);
}
