import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Missing PHP command arguments.');
  process.exit(1);
}

const discoverWindowsPhp = () => {
  if (process.platform !== 'win32') {
    return [];
  }

  const candidates = [];
  const wingetRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages')
    : null;

  if (wingetRoot && existsSync(wingetRoot)) {
    try {
      const wingetCandidates = readdirSync(wingetRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('PHP.PHP.'))
        .map((entry) => path.join(wingetRoot, entry.name, 'php.exe'))
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));

      candidates.push(...wingetCandidates);
    } catch {
      // Fall through to PATH and the remaining conventional locations.
    }
  }

  if (process.env.ProgramFiles) {
    candidates.push(path.join(process.env.ProgramFiles, 'PHP', 'php.exe'));
  }

  if (process.env.ChocolateyInstall) {
    candidates.push(path.join(process.env.ChocolateyInstall, 'bin', 'php.exe'));
  }

  return candidates;
};

const candidates = [...new Set([
  process.env.PHP_BIN,
  'php',
  ...discoverWindowsPhp(),
].filter(Boolean))];

const firstArg = args[0];
const artisanPath = firstArg?.endsWith('artisan') ? firstArg : null;
const cwd = artisanPath ? path.resolve(path.dirname(artisanPath)) : process.cwd();
const normalizedArgs = artisanPath ? [path.basename(artisanPath), ...args.slice(1)] : args;

const runCandidate = (index) => {
  if (index >= candidates.length) {
    console.error('Unable to locate php.exe. Set PHP_BIN to a valid PHP executable path.');
    process.exit(1);
  }

  const candidate = candidates[index];

  if (candidate !== 'php' && !existsSync(candidate)) {
    runCandidate(index + 1);
    return;
  }

  const child = spawn(candidate, normalizedArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  child.once('error', () => runCandidate(index + 1));
  child.once('exit', (code) => process.exit(code ?? 1));
};

runCandidate(0);
