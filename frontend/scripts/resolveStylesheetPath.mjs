import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesRoot = path.resolve(fileURLToPath(new URL('../src/styles', import.meta.url)));

// CSS maintenance scripts may only read and write stylesheets inside src/styles.
export const resolveStylesheetPath = (candidate) => {
  const resolved = path.resolve(String(candidate || ''));
  const relative = path.relative(stylesRoot, resolved);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(resolved) !== '.css') {
    throw new Error(`Refusing to process ${candidate}: only .css files inside src/styles are allowed.`);
  }

  return path.join(stylesRoot, relative);
};
