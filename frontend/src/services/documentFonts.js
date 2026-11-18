const asDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// SVG images cannot load external font files, even when the page has loaded them.
export async function documentFontCss(element, signal) {
  const families = new Set([...element.querySelectorAll('*'), element]
    .flatMap(node => getComputedStyle(node).fontFamily.split(','))
    .map(name => name.trim().replace(/["']/g, '').toLowerCase()));
  const rules = [];
  for (const sheet of element.ownerDocument.styleSheets) {
    let entries;
    try { entries = sheet.cssRules; } catch { continue; }
    for (const rule of entries) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const family = rule.style.fontFamily.replace(/["']/g, '').toLowerCase();
      if (families.has(family)) rules.push({ css: rule.cssText, base: sheet.href || document.baseURI });
    }
  }
  const resources = new Map();
  return (await Promise.all(rules.map(async ({ css, base }) => {
    const urls = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)];
    for (const [match, , source] of urls) {
      const url = new URL(source, base).href;
      if (!resources.has(url)) resources.set(url, (async () => {
        const response = await fetch(url, { signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Document font unavailable');
        return asDataUrl(await response.blob());
      })());
      css = css.replace(match, `url("${await resources.get(url)}")`);
    }
    return css;
  }))).join('\n');
}
