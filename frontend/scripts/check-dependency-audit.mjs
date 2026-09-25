import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('Run this policy through npm run audit:policy so the npm CLI path is available.');
  process.exit(1);
}

const runAudit = (argumentsList, label) => {
  const audit = spawnSync(process.execPath, [npmCli, ...argumentsList], {
    cwd: frontendRoot,
    encoding: 'utf8',
    shell: false,
    timeout: 120_000,
  });

  if (audit.error) {
    console.error(`${label} dependency audit could not run: ${audit.error.message}`);
    process.exit(1);
  }

  try {
    return JSON.parse(audit.stdout || '{}');
  } catch {
    console.error(audit.stderr || audit.stdout || `${label} npm audit returned invalid JSON.`);
    process.exit(1);
  }
};

const productionReport = runAudit(['audit', '--omit=dev', '--json'], 'Production');
const fullReport = runAudit(['audit', '--json'], 'Full');

const findings = [];
const reviewedSeverities = new Set(['low', 'moderate', 'high', 'critical']);

const reviewReport = (report, severities) => {
  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities || {})) {
    for (const advisory of vulnerability.via || []) {
      if (typeof advisory !== 'object' || !severities.has(advisory.severity)) continue;

      findings.push(`${packageName}: ${advisory.severity} ${advisory.url || advisory.title}`);
    }
  }
};

reviewReport(productionReport, reviewedSeverities);
reviewReport(fullReport, reviewedSeverities);

if (findings.length > 0) {
  console.error('Unapproved dependency advisories:');
  findings.forEach(finding => console.error(`- ${finding}`));
  process.exit(1);
}

const productionMetadata = productionReport.metadata?.vulnerabilities || {};
const fullMetadata = fullReport.metadata?.vulnerabilities || {};
console.log(`npm audit policy passed (production: critical=${productionMetadata.critical || 0}, high=${productionMetadata.high || 0}, moderate=${productionMetadata.moderate || 0}, low=${productionMetadata.low || 0}; full tree: critical=${fullMetadata.critical || 0}, high=${fullMetadata.high || 0}).`);
