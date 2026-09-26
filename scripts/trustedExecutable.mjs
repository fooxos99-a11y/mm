import { existsSync } from 'node:fs';
import path from 'node:path';

// Resolve system tools from fixed install locations instead of searching PATH,
// so a writable directory earlier in PATH cannot shadow them.
const windowsRoot = process.env.SystemRoot || 'C:\\Windows';
const programFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files']
  .filter(Boolean);

const CANDIDATES = {
  git: process.platform === 'win32'
    ? programFiles.flatMap((root) => [
      path.win32.join(root, 'Git', 'cmd', 'git.exe'),
      path.win32.join(root, 'Git', 'bin', 'git.exe'),
    ])
    : ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git'],
  taskkill: [path.win32.join(windowsRoot, 'System32', 'taskkill.exe')],
};

export const resolveTrustedExecutable = (name, { exists = existsSync } = {}) => (
  (CANDIDATES[name] || []).find((candidate) => exists(candidate)) || null
);
