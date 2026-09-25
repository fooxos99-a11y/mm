import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const status = git('status', '--porcelain=v1', '--untracked-files=all');

if (status) {
  console.error('Release verification requires a clean checkout. Dirty paths:');
  console.error(status);
  process.exit(1);
}

const commit = git('rev-parse', '--verify', 'HEAD');
const exactTags = git('tag', '--points-at', commit).split(/\r?\n/).filter(Boolean);
console.log(`Clean release checkout verified at ${commit}${exactTags.length ? ` (${exactTags.join(', ')})` : ''}.`);
