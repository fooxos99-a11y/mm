import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { resolveStylesheetPath } from './resolveStylesheetPath.mjs';

const MAX_LINES = 450;

if (!process.argv[2]) throw new Error('Usage: node scripts/split-css.mjs <css-file>');

const inputPath = resolveStylesheetPath(process.argv[2]);

const lineCount = (value) => String(value).split(/\r?\n/).length;

function expandNode(node) {
  if (lineCount(node.toString()) <= MAX_LINES || !node.nodes?.length) return [node.clone()];
  const groups = [];
  let current = node.clone({ nodes: [] });
  node.nodes.forEach((child) => {
    const candidate = current.clone();
    candidate.append(child.clone());
    if (current.nodes.length && lineCount(candidate.toString()) > MAX_LINES) {
      groups.push(current);
      current = node.clone({ nodes: [child.clone()] });
    } else {
      current.append(child.clone());
    }
  });
  if (current.nodes.length) groups.push(current);
  return groups;
}

const root = postcss.parse(fs.readFileSync(inputPath, 'utf8'), { from: inputPath });
const chunks = [];
let current = postcss.root();

root.nodes.flatMap(expandNode).forEach((node) => {
  const candidate = current.clone();
  candidate.append(node.clone());
  if (current.nodes.length && lineCount(candidate.toString()) > MAX_LINES) {
    chunks.push(current);
    current = postcss.root({ nodes: [node.clone()] });
  } else {
    current.append(node.clone());
  }
});
if (current.nodes.length) chunks.push(current);

const parsed = path.parse(inputPath);
const outputPaths = chunks.map((chunk, index) => {
  const output = index === 0
    ? inputPath
    : resolveStylesheetPath(path.join(parsed.dir, `${parsed.name}-part-${index + 1}${parsed.ext}`));
  fs.writeFileSync(output, `${chunk.toString()}\n`, 'utf8');
  return output.replaceAll('\\', '/');
});

process.stdout.write(`${outputPaths.join('\n')}\n`);
