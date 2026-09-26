import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveTrustedExecutable } from './trustedExecutable.mjs';
import { fileURLToPath } from 'node:url';

const rootDirectory = fileURLToPath(new URL('../', import.meta.url));
const ignoredDirectories = new Set([
  '.git', '.idea', '.phpunit.cache', '.vscode', 'blob-report', 'coverage', 'dist',
  'node_modules', 'playwright-report', 'storage', 'test-results', 'vendor',
]);

function listWorkspaceFiles(directory = rootDirectory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listWorkspaceFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(relative(rootDirectory, absolutePath));
    }
  }

  return files;
}

const gitExecutable = resolveTrustedExecutable('git');
const listed = gitExecutable
  ? spawnSync(
    gitExecutable,
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: rootDirectory, encoding: 'utf8', shell: false },
  )
  : { status: 1, stdout: '' };
const usingGit = listed.status === 0;
const files = usingGit
  ? listed.stdout.split('\0').filter(Boolean)
  : listWorkspaceFiles();

const textExtensions = new Set([
  '', '.env', '.example', '.html', '.ini', '.js', '.json', '.jsx', '.md', '.mjs',
  '.php', '.ps1', '.scss', '.sh', '.sql', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yaml', '.yml',
]);
const ignoredFiles = new Set(['package-lock.json', 'composer.lock']);
const patterns = [
  ['private key', /-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE KEY-----/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_\w{40,})\b/g],
  ['API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['Stripe live key', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
];
const findings = [];

for (const file of files) {
  const normalized = file.replaceAll('\\', '/');
  const name = normalized.split('/').at(-1) || normalized;

  if (ignoredFiles.has(name) || normalized.startsWith('frontend/dist/')) continue;
  if (name.startsWith('.env') && !name.endsWith('.example')) {
    if (usingGit) findings.push(`${normalized}: tracked or unignored environment file`);
    continue;
  }
  if (!textExtensions.has(extname(name).toLowerCase())) continue;

  let content;
  try {
    content = readFileSync(join(rootDirectory, file), 'utf8');
  } catch {
    continue;
  }

  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (!match) continue;

    const line = content.slice(0, match.index).split(/\r?\n/).length;
    findings.push(`${normalized}:${line}: possible ${label}`);
  }
}

if (findings.length) {
  const findingLines = findings.map((item) => `- ${item}`).join('\n');
  process.stderr.write(`Secret scan failed:\n${findingLines}\n`);
  process.exit(1);
}

const source = usingGit ? 'Git working tree' : 'workspace fallback';
process.stdout.write(`Secret scan passed (${files.length} files checked from ${source}).\n`);
