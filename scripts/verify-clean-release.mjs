import { execFileSync } from 'node:child_process';
import { resolveTrustedExecutable } from './trustedExecutable.mjs';

const gitExecutable = resolveTrustedExecutable('git');

if (!gitExecutable) {
  console.error('Release verification requires Git installed in a standard system location.');
  process.exit(1);
}

const git = (...args) => execFileSync(gitExecutable, args, { encoding: 'utf8' }).trim();
const status = git('status', '--porcelain=v1', '--untracked-files=all');

if (status) {
  console.error('Release verification requires a clean checkout. Dirty paths:');
  console.error(status);
  process.exit(1);
}

const commit = git('rev-parse', '--verify', 'HEAD');
const exactTags = git('tag', '--points-at', commit).split(/\r?\n/).filter(Boolean);
const tagSuffix = exactTags.length ? ` (${exactTags.join(', ')})` : '';
console.log(`Clean release checkout verified at ${commit}${tagSuffix}.`);
