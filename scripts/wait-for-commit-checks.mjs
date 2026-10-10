import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { resolveTrustedExecutable } from './trustedExecutable.mjs';

const stateOf = (check) => {
  if (!check || check.status !== 'completed') return 'pending';
  return check.conclusion === 'success' ? 'success' : 'failure';
};

export const requiredCheckStates = (runs, checks, sha) => {
  const newestFirst = (left, right) => right.id - left.id;
  const verify = runs.filter((run) => run.head_sha === sha
    && run.path === '.github/workflows/verify.yml').toSorted(newestFirst)[0];
  const sonar = checks.filter((check) => check.head_sha === sha
    && check.name === 'SonarCloud Code Analysis'
    && check.app?.slug === 'sonarqubecloud').toSorted(newestFirst)[0];
  return { Verify: stateOf(verify), SonarCloud: stateOf(sonar) };
};

export const waitForCommitChecks = async ({
  repo, sha, token, timeoutMs = 12 * 60_000, pollMs = 15_000,
  fetcher = fetch, now = Date.now, pause = delay, log = console.log,
}) => {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !/^[a-f\d]{40}$/i.test(sha || '') || !token) {
    throw new Error('A repository, exact commit SHA, and GitHub token are required.');
  }
  const query = async (suffix) => {
    const response = await fetcher(`https://api.github.com/repos/${repo}/${suffix}`, {
      headers: {
        Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'momars-release-gate',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub check lookup failed (HTTP ${response.status}).`);
    return response.json();
  };
  const deadline = now() + timeoutMs;
  let previousSummary = '';
  const poll = async () => {
    const [runs, checks] = await Promise.all([
      query(`actions/workflows/verify.yml/runs?head_sha=${sha}&per_page=100`),
      query(`commits/${sha}/check-runs?check_name=SonarCloud%20Code%20Analysis&per_page=100`),
    ]);
    if (!Array.isArray(runs.workflow_runs) || !Array.isArray(checks.check_runs)) {
      throw new Error('GitHub returned an invalid check response.');
    }
    const states = requiredCheckStates(runs.workflow_runs, checks.check_runs, sha);
    const summary = Object.entries(states).map(([name, state]) => `${name}: ${state}`).join('; ');
    if (summary !== previousSummary) log(summary);
    previousSummary = summary;
    if (Object.values(states).includes('failure')) throw new Error(`Release blocked: ${summary}.`);
    if (Object.values(states).every((state) => state === 'success')) return states;
    if (now() >= deadline) throw new Error(`Release blocked: required checks did not finish within ${timeoutMs} ms.`);
    await pause(pollMs);
    return poll();
  };
  return poll();
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const git = resolveTrustedExecutable('git');
    if (!git) throw new Error('Git is unavailable in the trusted install locations.');
    const sha = execFileSync(git, ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
    await waitForCommitChecks({ repo: process.env.GITHUB_REPOSITORY, sha, token: process.env.GITHUB_TOKEN });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
