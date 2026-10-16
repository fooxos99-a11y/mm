import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bash = (process.platform === 'win32'
  ? [path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe')]
  : ['/bin/bash', '/usr/bin/bash']).find(existsSync);
const posix = (value) => value.replaceAll('\\', '/').replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
const shellFile = (root, name, content) => writeFileSync(path.join(root, name), `#!/usr/bin/env bash\nset -eu\n${content}\n`, { mode: 0o755 });
const fixtureProcesses = new Map();
const cleanup = (root) => {
  assert.equal(path.dirname(root), path.resolve(tmpdir()));
  assert.match(path.basename(root), /^momars-deployment-test-/);
  fixtureProcesses.get(root)?.kill();
  fixtureProcesses.delete(root);
  rmSync(root, { recursive: true, force: true });
};
const run = (script, args, fixture, extra = {}) => spawnSync(bash, [
  '-c', 'PATH="$1:$PATH"; shift; exec bash "$@"', '--', posix(fixture.bin),
  posix(path.join(repository, script)), ...args.map(posix),
], {
  cwd: repository, encoding: 'utf8',
  env: { ...process.env, EVENT_LOG: posix(fixture.events), TEST_SHARED: posix(fixture.shared),
    TEST_FPM_MASTER: String(fixtureProcesses.get(fixture.root)?.pid || 0), ...extra.env },
  input: extra.input,
});

const fixture = () => {
  const root = mkdtempSync(path.join(path.resolve(tmpdir()), 'momars-deployment-test-'));
  const deployment = path.join(root, 'app');
  const shared = path.join(deployment, 'shared');
  const bin = path.join(root, 'bin');
  const events = path.join(root, 'events');
  mkdirSync(bin);
  mkdirSync(path.join(shared, 'storage/framework'), { recursive: true });
  mkdirSync(path.join(deployment, 'current/backend'), { recursive: true });
  writeFileSync(path.join(deployment, 'current/backend/artisan'), '');
  writeFileSync(path.join(shared, '.env'), 'APP_ENV=production\n');
  shellFile(bin, 'sudo', 'if [[ "$1" == -n && "$2" == systemctl ]]; then shift; exec "$@"; fi; exit 1');
  shellFile(bin, 'flock', '[[ "${FAIL_LOCK:-}" != 1 ]]');
  shellFile(bin, 'composer', 'echo composer >> "$EVENT_LOG"');
  shellFile(bin, 'systemctl', `case "$1" in
  show) if [[ "$*" == *ExecStart* ]]; then echo '/usr/bin/php artisan queue:work --sleep=3';
    elif [[ "$2" == momars-queue ]]; then echo 0; else echo "$TEST_FPM_MASTER"; fi ;;
  reload)
    echo fpm-reload >> "$EVENT_LOG"
    if [[ -f "\${TEST_SHARED%/shared}/current/.schema-generation" && "\${FAIL_STAGE:-}" == activation-fpm ]]; then exit 9; fi ;;
  restart)
    if [[ -f "\${TEST_SHARED%/shared}/current/.schema-generation" ]]; then
      echo queue-new-release-restart >> "$EVENT_LOG"
      [[ "\${FAIL_STAGE:-}" != activation-queue ]] || exit 9
    else echo queue-idle-restart >> "$EVENT_LOG"; fi ;;
  is-active) exit 0 ;;
esac`);
  shellFile(bin, 'php', `
if [[ "$1" == *backup-deployment.php ]]; then
  echo backup >> "$EVENT_LOG"
  [[ "\${FAIL_STAGE:-}" != backup ]] || exit 9
  printf 'verified-database' > "$3/database.sql"
  printf '{}' > "$3/database.json"
  exit 0
fi
case "$2" in
  down) echo down >> "$EVENT_LOG"; touch "$TEST_SHARED/storage/framework/down" ;;
  migrate)
    echo migrate >> "$EVENT_LOG"
    [[ -f "$TEST_SHARED/deployment-recovery-required" ]] || exit 18
    if [[ "\${FAIL_STAGE:-}" == interrupt ]]; then kill -TERM "$PPID"; exit 0; fi
    if [[ "\${FAIL_STAGE:-}" == crash ]]; then kill -KILL "$PPID"; exit 0; fi
    [[ "\${FAIL_STAGE:-}" != migrate ]] || exit 9 ;;
  department:secure-legacy-media) echo media >> "$EVENT_LOG"; [[ "\${FAIL_STAGE:-}" != media ]] || exit 9 ;;
  up) echo up >> "$EVENT_LOG"; rm -f "$TEST_SHARED/storage/framework/down" ;;
  departments:create-general-manager)
    printf '%s\\n' "$@" > "$EVENT_LOG"
    sha256sum > "$EVENT_LOG.password-hash"
    echo 'Account created.' ;;
  *) echo "$2" >> "$EVENT_LOG" ;;
esac`);
  return { root, deployment, shared, bin, events };
};

test('deployment, rollback and private account bootstrap shell syntax is valid', { skip: !bash }, () => {
  for (const script of ['deploy-release.sh', 'rollback-release.sh', 'bootstrap-general-manager.sh', 'quiesce-deployment.sh']) {
    const result = spawnSync(bash, ['-n', posix(path.join(repository, 'scripts', script))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('account bootstrap passes password only through stdin and keeps option-like names positional', { skip: !bash }, () => {
  const data = fixture();
  try {
    const password = '31415926';
    const name = '--env=production';
    const result = run('scripts/bootstrap-general-manager.sh', [
      Buffer.from(posix(data.deployment)).toString('base64'), '54831', Buffer.from(name).toString('base64'),
    ], data, { input: password });
    assert.equal(result.status, 0, result.stderr);
    const argumentsLog = readFileSync(data.events, 'utf8');
    assert.match(argumentsLog, /--password-stdin\n--no-interaction\n--\n54831\n--env=production/);
    assert.ok(!argumentsLog.includes(password));
    assert.ok(!result.stdout.includes(password));
    assert.ok(!result.stderr.includes(password));
    assert.equal(readFileSync(`${data.events}.password-hash`, 'utf8').split(/\s/)[0], createHash('sha256').update(password).digest('hex'));
  } finally {
    cleanup(data.root);
  }
});

test('account bootstrap refuses to run while deployment owns its lock', { skip: !bash }, () => {
  const data = fixture();
  try {
    const result = run('scripts/bootstrap-general-manager.sh', [
      Buffer.from(posix(data.deployment)).toString('base64'), '54831', Buffer.from('General manager').toString('base64'),
    ], data, { input: '31415926', env: { FAIL_LOCK: '1' } });
    assert.equal(result.status, 75);
    assert.equal(existsSync(data.events), false);
  } finally {
    cleanup(data.root);
  }
});

const releaseFixture = () => {
  const data = fixture();
  rmSync(path.join(data.deployment, 'current'), { recursive: true });
  const previous = path.join(data.deployment, 'releases/previous1');
  mkdirSync(path.join(previous, 'backend'), { recursive: true });
  writeFileSync(path.join(previous, 'backend/artisan'), '');
  symlinkSync(previous, path.join(data.deployment, 'current'), 'dir');
  const payload = path.join(data.root, 'payload');
  mkdirSync(path.join(payload, 'backend/bootstrap/cache'), { recursive: true });
  mkdirSync(path.join(payload, 'scripts'));
  writeFileSync(path.join(payload, 'backend/artisan'), '');
  writeFileSync(path.join(payload, 'scripts/backup-deployment.php'), '<?php');
  writeFileSync(path.join(payload, 'scripts/quiesce-deployment.sh'), readFileSync(path.join(repository, 'scripts/quiesce-deployment.sh')));
  data.archive = path.join(data.root, 'release.tgz');
  const packed = spawnSync(bash, ['-c', 'tar -czf "$1" -C "$2" .', '--', posix(data.archive), posix(payload)], { encoding: 'utf8' });
  if (packed.status !== 0) cleanup(data.root);
  assert.equal(packed.status, 0, packed.stderr);
  data.previous = previous;
  fixtureProcesses.set(data.root, spawn('/bin/sleep', ['300'], { stdio: 'ignore' }));
  return data;
};
const linuxOnly = { skip: process.platform === 'win32' || !bash ? 'Atomic Linux symlink behavior runs on the Ubuntu release runner.' : false };

test('release verifies snapshots before migration and secures legacy media before activation', linuxOnly, () => {
  const data = releaseFixture();
  try {
    const result = run('scripts/deploy-release.sh', [data.deployment, data.archive, 'release123'], data);
    assert.equal(result.status, 0, result.stderr);
    const events = readFileSync(data.events, 'utf8').trim().split('\n');
    assert.ok(events.indexOf('backup') < events.indexOf('migrate'));
    assert.ok(events.indexOf('queue-idle-restart') < events.indexOf('backup'));
    assert.ok(events.indexOf('migrate') < events.indexOf('media'));
    assert.ok(events.indexOf('media') < events.indexOf('queue-new-release-restart'));
    assert.ok(events.indexOf('queue-new-release-restart') < events.indexOf('up'));
    const backup = path.join(data.deployment, 'backups', readdirSync(path.join(data.deployment, 'backups'))[0]);
    assert.equal(readFileSync(path.join(backup, 'database.sql'), 'utf8'), 'verified-database');
    assert.ok(existsSync(path.join(backup, 'storage.tgz')));
    assert.ok(existsSync(path.join(backup, 'SHA256SUMS')));
    assert.equal(existsSync(path.join(data.shared, 'storage/framework/down')), false);
    assert.equal(readFileSync(path.join(data.deployment, 'current/.schema-generation'), 'utf8').trim(), 'department-isolation-v1');
  } finally {
    cleanup(data.root);
  }
});

for (const stage of ['backup', 'migrate', 'media', 'interrupt', 'crash', 'activation-fpm', 'activation-queue']) {
  test(`failed ${stage} never exposes old code to changed schema`, linuxOnly, () => {
    const data = releaseFixture();
    try {
      const result = run('scripts/deploy-release.sh', [data.deployment, data.archive, 'release123'], data, { env: { FAIL_STAGE: stage } });
      if (stage === 'crash') assert.equal(result.signal, 'SIGKILL');
      else assert.equal(result.status, stage === 'interrupt' ? 143 : 9, result.stderr);
      const events = readFileSync(data.events, 'utf8').trim().split('\n');
      assert.equal(existsSync(path.join(data.deployment, 'current/.schema-generation')), stage.startsWith('activation-'));
      assert.equal(existsSync(path.join(data.shared, 'storage/framework/down')), stage !== 'backup');
      assert.equal(existsSync(path.join(data.shared, 'deployment-recovery-required')), stage !== 'backup');
      if (stage === 'backup') assert.equal(events.includes('migrate'), false);
      else assert.equal(events.includes('up'), false);
    } finally {
      cleanup(data.root);
    }
  });
}

test('code rollback refuses incompatible schema generations', linuxOnly, () => {
  const data = releaseFixture();
  try {
    writeFileSync(path.join(data.previous, '.schema-generation'), 'department-isolation-v1');
    const old = path.join(data.deployment, 'releases/legacy123');
    mkdirSync(path.join(old, 'backend'), { recursive: true });
    writeFileSync(path.join(old, 'backend/artisan'), '');
    const result = run('scripts/rollback-release.sh', [data.deployment, 'legacy123'], data);
    assert.equal(result.status, 78);
    assert.equal(existsSync(data.events), false);
  } finally {
    cleanup(data.root);
  }
});

test('database snapshot copies scratch SQLite and refuses to overwrite an earlier backup', () => {
  const data = fixture();
  try {
    const database = path.join(data.root, 'scratch.sqlite');
    const backup = path.join(data.root, 'backup');
    const storage = path.join(data.root, 'storage');
    mkdirSync(backup);
    mkdirSync(path.join(storage, 'framework/cache/data'), { recursive: true });
    const php = (...args) => spawnSync(process.execPath, ['scripts/run-php.mjs', ...args], {
      cwd: repository, encoding: 'utf8', env: {
        ...process.env, APP_ENV: 'testing', APP_KEY: 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', CACHE_STORE: 'array', LARAVEL_STORAGE_PATH: storage,
      },
    });
    const initialized = php('-r', '$pdo=new PDO("sqlite:".$argv[1]);$pdo->exec("CREATE TABLE marker (value TEXT); INSERT INTO marker VALUES (\\"snapshot-proof\\")");', database);
    assert.equal(initialized.status, 0, initialized.stderr);
    const result = php('scripts/backup-deployment.php', path.join(repository, 'backend'), backup);
    assert.equal(result.status, 0, result.stderr);
    const snapshot = path.join(backup, 'database.sqlite');
    const digest = createHash('sha256').update(readFileSync(snapshot)).digest('hex');
    const checked = php('-r', '$pdo=new PDO("sqlite:".$argv[1]);echo $pdo->query("SELECT value FROM marker")->fetchColumn();', snapshot);
    assert.equal(checked.stdout, 'snapshot-proof');
    assert.equal(php('scripts/backup-deployment.php', path.join(repository, 'backend'), backup).status, 1);
    assert.equal(createHash('sha256').update(readFileSync(snapshot)).digest('hex'), digest);
  } finally {
    cleanup(data.root);
  }
});
