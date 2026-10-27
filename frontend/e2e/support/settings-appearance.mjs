export async function settingsAppearance(page, selector, actionName, headerSelector = '.app-settings-panel__header') {
  // Measure the settled button style, after hover/focus and entrance transitions finish.
  await page.mouse.move(0, 0);
  await page.locator(selector).evaluate(async card => {
    await Promise.all(card.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
  });
  return page.locator(selector).evaluate((card, { actionName: name, headerSelector: targetHeader }) => {
    const style = (element, properties) => {
      const css = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, css[property]]));
    };
    const typography = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'];
    const header = card.querySelector(targetHeader);
    const heading = header.querySelector('h1');
    const button = [...header.querySelectorAll('button')].find(element => element.textContent.trim() === name);
    const toolbar = card.querySelector('.app-filter-toolbar');
    const cardRect = card.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      card: style(card, ['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'boxShadow']),
      padding: style(card.querySelector('.app-card__body'), ['padding']),
      heading: style(heading, typography),
      button: style(button, [...typography, 'borderRadius', 'backgroundColor', 'paddingInlineStart', 'paddingInlineEnd', 'minWidth']),
      label: style(toolbar.querySelector('.app-filter-field__label'), typography),
      control: style(toolbar.querySelector('.v-field__input'), typography),
      toolbar: style(toolbar, ['columnGap', 'rowGap', 'paddingBottom', 'marginBottom', 'borderBottomColor']),
      columns: getComputedStyle(toolbar).gridTemplateColumns.split(' ').length,
      titleRightInset: Math.round(cardRect.right - headingRect.right),
      titleTopInset: Math.round(headingRect.top - cardRect.top),
      actionLeftInset: Math.round(buttonRect.left - cardRect.left),
      actionTopInset: Math.round(buttonRect.top - cardRect.top),
      actionHeight: Math.round(buttonRect.height),
    };
  }, { actionName, headerSelector });
}
