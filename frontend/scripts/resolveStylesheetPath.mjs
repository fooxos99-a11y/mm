import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesRoot = path.resolve(fileURLToPath(new URL('../src/styles', import.meta.url)));

const toPosix = (value) => value.split(path.sep).join('/');

// Every stylesheet that exists under src/styles, keyed by its path relative to that folder.
const listStylesheets = (directory = stylesRoot, found = new Map()) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      listStylesheets(absolutePath, found);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      found.set(toPosix(path.relative(stylesRoot, absolutePath)), absolutePath);
    }
  }

  return found;
};

// CSS maintenance scripts only touch stylesheets that already exist in src/styles.
// The command-line value is used as a lookup key; the path itself comes from the directory listing.
export const resolveStylesheetPath = (candidate) => {
  const key = toPosix(path.relative(stylesRoot, path.resolve(String(candidate || ''))));
  const stylesheet = listStylesheets().get(key);

  if (!stylesheet) {
    throw new Error(`Refusing to process ${candidate}: only existing .css files inside src/styles are allowed.`);
  }

  return stylesheet;
};

// Sibling "<name>-part-N.css" file for a stylesheet returned by resolveStylesheetPath.
export const stylesheetPartPath = (stylesheet, partNumber) => {
  const parsed = path.parse(stylesheet);

  return path.join(parsed.dir, `${parsed.name}-part-${Number.parseInt(partNumber, 10)}.css`);
};
