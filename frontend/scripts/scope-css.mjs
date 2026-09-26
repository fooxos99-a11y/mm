import fs from 'node:fs';
import postcss from 'postcss';
import { resolveStylesheetPath } from './resolveStylesheetPath.mjs';

const [rootSelector, ...inputPaths] = process.argv.slice(2);

if (!rootSelector || inputPaths.length === 0) {
  throw new Error('Usage: node scripts/scope-css.mjs <root-selector> <css-file...>');
}

const unwrapDeepSelectors = selector => selector.replace(/:deep\(([^()]*)\)/g, '$1');

inputPaths.map(resolveStylesheetPath).forEach((inputPath) => {
  const root = postcss.parse(fs.readFileSync(inputPath, 'utf8'), { from: inputPath });

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;

    rule.selectors = rule.selectors.map((rawSelector) => {
      const selector = unwrapDeepSelectors(rawSelector.trim());
      return selector.includes(rootSelector) ? selector : `${rootSelector} ${selector}`;
    });
  });

  fs.writeFileSync(inputPath, `${root.toString()}\n`, 'utf8');
});
