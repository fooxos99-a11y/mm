import { spawn, spawnSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { createServer, request, Agent } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runWave, validateConcurrentRetry, validateGuards } from './workload.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const backend = path.join(root, 'backend');
const runDir = mkdtempSync(path.join(os.tmpdir(), 'momars-capacity-'));
const php = process.env.PHP_BIN || 'php';
const mysqlBin = process.env.CAPACITY_MYSQL_BIN || 'C:/Program Files/MySQL/MySQL Server 8.4/bin';
if (!existsSync(path.join(mysqlBin, 'mysqld.exe'))) throw new Error('Set CAPACITY_MYSQL_BIN to the installed MySQL bin directory.');
const levels = (process.env.CAPACITY_LEVELS || '1,10,25,50,100,200').split(',').map(Number);
const workers = Number(process.env.CAPACITY_WORKERS || 8);
if (process.env.CAPACITY_ASSESSMENT_TYPE === 'final' && levels.length !== 1) {
  throw new Error('Final exams require one capacity level per disposable run because attempts cannot be repeated.');
}
if (levels.some(value => !Number.isInteger(value) || value < 1 || value > 500)
  || !Number.isInteger(workers) || workers < 1 || workers > 16) throw new Error('Unsupported bounded local test configuration.');
const participantCount = levels.reduce((sum, count) => sum + count, 0)
  + (process.env.CAPACITY_CONTINUE_AFTER_FAILURE ? 0 : Math.max(...levels)) + 2;
const port = () => new Promise((resolve, reject) => {
  const server = createNetServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const number = server.address().port;
    server.close(error => error ? reject(error) : resolve(number));
  });
});
const dbPort = await port();
const proxyPort = await port();
const base = `http://127.0.0.1:${proxyPort}`;
const password = randomBytes(24).toString('base64url');
const storage = path.join(runDir, 'storage');
for (const directory of ['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs']) {
  mkdirSync(path.join(storage, directory), { recursive: true });
}
const env = { ...process.env, APP_ENV: 'local', APP_DEBUG: 'false',
  APP_KEY: `base64:${randomBytes(32).toString('base64')}`, APP_URL: base, FRONTEND_URL: base,
  APP_CONFIG_CACHE: path.relative(backend, path.join(runDir, 'config.php')).replaceAll('\\', '/'),
  APP_ROUTES_CACHE: path.relative(backend, path.join(runDir, 'routes.php')).replaceAll('\\', '/'),
  APP_SERVICES_CACHE: path.relative(backend, path.join(runDir, 'services.php')).replaceAll('\\', '/'),
  APP_PACKAGES_CACHE: path.relative(backend, path.join(runDir, 'packages.php')).replaceAll('\\', '/'),
  LARAVEL_STORAGE_PATH: storage, DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: String(dbPort),
  DB_DATABASE: 'momars_capacity', DB_USERNAME: 'root', DB_PASSWORD: '', DB_URL: '',
  SESSION_DRIVER: 'database', SESSION_SECURE_COOKIE: 'false', SESSION_DOMAIN: '', SESSION_LIFETIME: '120',
  CACHE_STORE: 'database', QUEUE_CONNECTION: 'database', BROADCAST_CONNECTION: 'log', BCRYPT_ROUNDS: '12',
  SANCTUM_STATEFUL_DOMAINS: `127.0.0.1:${proxyPort}`, CORS_ALLOWED_ORIGINS: base,
  CAPACITY_DB_PORT: String(dbPort), CAPACITY_RUN_DIR: runDir, CAPACITY_PASSWORD: password,
  CAPACITY_USERS: String(participantCount),
};
const children = [];
const command = (binary, args, options = {}) => {
  const result = spawnSync(binary, args, { cwd: backend, env, encoding: 'utf8', timeout: 180_000, ...options });
  if (result.status !== 0) {
    // Fixture/login secrets stay out of error output.
    const detail = `${result.stdout || ''}\n${result.stderr || ''}`.replaceAll(password, '[redacted]').slice(-3000);
    throw new Error(`${path.basename(binary)} failed: ${detail}`);
  }
  return result.stdout;
};
const opcacheAlreadyLoaded = command(php, ['-r', 'echo extension_loaded("Zend OPcache") ? "1" : "0";']).trim() === '1';
const serverPhpArgs = [];
if (process.env.CAPACITY_OPCACHE === '1' && !opcacheAlreadyLoaded) {
  const extension = path.join(path.dirname(php), 'ext', 'php_opcache.dll');
  if (!existsSync(extension)) throw new Error('Requested OPcache extension is unavailable for this PHP binary.');
  serverPhpArgs.push('-d', `zend_extension=${extension}`);
}
const opcacheLoaded = command(php, [...serverPhpArgs, '-r', 'echo extension_loaded("Zend OPcache") ? "1" : "0";']).trim() === '1';
const fixture = action => JSON.parse(command(php, [path.join(root, 'scripts/capacity/fixture.php'), action]));
const waitFor = async (probe, label) => {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try { if (await probe()) return; } catch { /* Wait for the owned server to become ready. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`${label} was not ready within 45 seconds.`);
};
const report = { startedAt: new Date().toISOString(), commit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  source: { dirty: spawnSync('git', ['diff', '--quiet'], { cwd: root }).status !== 0,
    assessmentServiceSha256: createHash('sha256').update(readFileSync(path.join(backend, 'app/Services/Concerns/SubmitsCourseAssessments.php'))).digest('hex'),
    finalExamServiceSha256: createHash('sha256').update(readFileSync(path.join(backend, 'app/Services/Concerns/ProcessesFinalExamSubmissions.php'))).digest('hex'),
    studentAnswerValidatorSha256: createHash('sha256').update(readFileSync(path.join(backend, 'app/Services/StudentAssessmentAnswerValidator.php'))).digest('hex') },
  environment: { kind: 'isolated-local', cpu: os.cpus()[0].model, logicalProcessors: os.cpus().length,
    memoryGiB: +(os.totalmem() / 1024 ** 3).toFixed(1), workers, database: 'MySQL 8.4 disposable instance',
    php: command(php, ['-r', 'echo PHP_VERSION;']).trim(), cache: 'database', sessions: 'database', bcryptRounds: 12,
    opcacheLoaded,
    configAndRouteCache: true, loadGeneratorSharesHost: true },
  serverErrors: { total: 0, sqlStates: {} },
  scenario: { backgroundCourses: 30, questionsPerExam: 20, attachments: false,
    assessmentType: env.CAPACITY_ASSESSMENT_TYPE || 'pre',
    entityType: env.CAPACITY_ASSESSMENT_TYPE === 'tasks' ? 'task' : env.CAPACITY_ASSESSMENT_TYPE === 'final' ? 'finalExam' : 'course',
    transport: 'HTTP with separate authenticated sessions and CSRF cookies',
    phases: ['csrf', 'login', 'openExam', 'submitExam', 'results'],
    thinkTimeSeconds: 0, retries: 0, timeoutsMs: 30_000,
    limits: { errors: 0, loginP95Ms: 3000, openP95Ms: 2000, submitP95Ms: 3000, resultsP95Ms: 2000 } }, waves: [] };
let mysql;
let proxy;
try {
  console.log('Preparing a disposable local MySQL instance; operational databases are untouched.');
  const data = path.join(runDir, 'mysql-data');
  mkdirSync(data);
  const ini = path.join(runDir, 'mysql.ini');
  writeFileSync(ini, `[mysqld]\nbasedir="${path.dirname(mysqlBin).replaceAll('\\', '/')}"\ndatadir="${data.replaceAll('\\', '/')}"\nport=${dbPort}\nbind-address=127.0.0.1\nmysqlx=0\ninnodb-buffer-pool-size=268435456\nmax-connections=100\n`);
  command(path.join(mysqlBin, 'mysqld.exe'), [`--defaults-file=${ini}`, '--initialize-insecure'], { cwd: mysqlBin });
  mysql = spawn(path.join(mysqlBin, 'mysqld.exe'), [`--defaults-file=${ini}`, '--console'], { cwd: mysqlBin, stdio: 'ignore', windowsHide: true });
  children.push(mysql);
  await waitFor(() => spawnSync(path.join(mysqlBin, 'mysqladmin.exe'), ['--protocol=TCP', '--host=127.0.0.1', `--port=${dbPort}`, '--user=root', 'ping'], { windowsHide: true }).status === 0, 'MySQL');
  command(path.join(mysqlBin, 'mysql.exe'), ['--protocol=TCP', '--host=127.0.0.1', `--port=${dbPort}`, '--user=root'], {
    input: 'CREATE DATABASE momars_capacity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n',
  });
  command(php, ['artisan', 'migrate', '--force', '--no-interaction']);
  report.dataset = fixture('seed');
  command(php, ['artisan', 'config:cache']);
  command(php, ['artisan', 'route:cache']);
  const targets = [];
  for (let index = 0; index < workers; index++) {
    const workerPort = await port();
    const child = spawn(php, [...serverPhpArgs, '-d', 'opcache.enable_cli=1', '-d', 'opcache.validate_timestamps=0',
      '-d', 'max_execution_time=60', '-S', `127.0.0.1:${workerPort}`, '-t', 'public', 'server.php'],
    { cwd: backend, env, stdio: 'ignore', windowsHide: true });
    children.push(child);
    await waitFor(async () => (await fetch(`http://127.0.0.1:${workerPort}/up`)).ok, `PHP worker ${index + 1}`);
    targets.push({ port: workerPort, pending: 0, agent: new Agent({ keepAlive: true, maxSockets: 1 }) });
  }
  proxy = createServer((incoming, outgoing) => {
    const target = targets.reduce((best, candidate) => candidate.pending < best.pending ? candidate : best);
    target.pending++;
    const upstream = request({ host: '127.0.0.1', port: target.port, path: incoming.url,
      method: incoming.method, agent: target.agent, headers: incoming.headers }, response => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    });
    let finished = false;
    const finish = () => { if (!finished) { finished = true; target.pending--; } };
    upstream.on('close', finish);
    upstream.on('error', () => { finish(); if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(upstream);
  });
  proxy.listen(proxyPort, '127.0.0.1');
  await once(proxy, 'listening');
  console.log(`Ready: ${workers} PHP workers, MySQL, 30 background courses, 20 questions per exam.`);
  env.CAPACITY_WAVE = 'security';
  const guardCourse = fixture('wave');
  report.securityChecks = await validateGuards({ base, index: participantCount - 2, password, course: guardCourse });
  if (Object.values(report.securityChecks).some(check => !check.ok)) throw new Error('Authenticated workload guard checks failed.');
  console.log('Verified authentication, CSRF, account ownership, and duplicate-submission rejection.');
  env.CAPACITY_WAVE = 'concurrent-retry';
  const retryCourse = fixture('wave');
  report.concurrentRetry = await validateConcurrentRetry({ base, index: participantCount - 1, password, course: retryCourse });
  const retryIntegrity = fixture('verify');
  report.concurrentRetry.ok &&= retryIntegrity.submissions === 2 && retryIntegrity.answers === 40
    && retryIntegrity.duplicates === 0 && retryIntegrity.incomplete === 0;
  if (!report.concurrentRetry.ok) throw new Error('Concurrent retry did not preserve exactly one complete submission.');
  console.log('Verified simultaneous duplicate requests: one complete submission, one rejected retry.');
  let waveIndex = 0;
  const measurements = [...levels];
  let previousPassed;
  let boundaryRepeated = false;
  let participantOffset = 0;
  for (let index = 0; index < measurements.length; index++) {
    const count = measurements[index];
    env.CAPACITY_WAVE = String(++waveIndex);
    const course = fixture('wave');
    const before = fixture('verify');
    const startUtilization = performance.eventLoopUtilization();
    console.log(`Starting synchronized wave: ${count} independent students.`);
    const wave = await runWave({ base, count, offset: participantOffset, password, course, verify: () => fixture('verify') });
    participantOffset += count;
    wave.persistedInThisWave = wave.persisted.submissions - before.submissions;
    wave.answersInThisWave = wave.persisted.answers - before.answers;
    wave.persistencePassed = Object.values(wave.phases).every(phase => phase.failed === 0)
      && wave.persistedInThisWave === count && wave.answersInThisWave === count * 20
      && wave.persisted.duplicates === 0 && wave.persisted.incomplete === 0;
    wave.acceptable &&= wave.persistedInThisWave === count && wave.answersInThisWave === count * 20;
    wave.loadGeneratorEventLoopPercent = +(performance.eventLoopUtilization(startUtilization).utilization * 100).toFixed(1);
    report.waves.push(wave);
    console.log(JSON.stringify({ students: count, completed: wave.completed, persisted: wave.persistedInThisWave,
      loginP95: wave.phases.login.p95Ms, openP95: wave.phases.openExam.p95Ms,
      submitP95: wave.phases.submitExam.p95Ms, statuses: wave.phases.submitExam.statusCounts, acceptable: wave.acceptable }));
    if (wave.acceptable) previousPassed = count;
    if (!wave.acceptable && !process.env.CAPACITY_CONTINUE_AFTER_FAILURE) {
      if (previousPassed && !boundaryRepeated) {
        boundaryRepeated = true;
        // Repeat the last successful level to distinguish saturation from a one-off result.
        measurements.splice(index + 1, measurements.length, previousPassed);
      } else break;
    }
  }
  report.completedAt = new Date().toISOString();
  if (process.env.CAPACITY_ASSERT_PERSISTENCE === '1' && report.waves.some(wave => !wave.persistencePassed)) {
    throw new Error('Concurrent assessment persistence checks failed; see the per-phase results.');
  }
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  const logPath = path.join(storage, 'logs', 'laravel.log');
  if (existsSync(logPath)) {
    const errors = readFileSync(logPath, 'utf8').split('\n').filter(line => line.includes('local.ERROR:'));
    report.serverErrors = { total: errors.length, sqlStates: errors.reduce((counts, line) => {
      const state = line.match(/SQLSTATE\[([^\]]+)\]/)?.[1];
      if (state) counts[state] = (counts[state] || 0) + 1;
      return counts;
    }, {}) };
  }
  if (proxy) { proxy.closeAllConnections(); proxy.close(); }
  for (const child of children.filter(child => child !== mysql)) child.kill();
  if (mysql) {
    spawnSync(path.join(mysqlBin, 'mysqladmin.exe'), ['--protocol=TCP', '--host=127.0.0.1', `--port=${dbPort}`, '--user=root', 'shutdown'], { timeout: 10_000, windowsHide: true });
    mysql.kill();
  }
  const output = path.join(root, 'reports', `assessment-capacity-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.json`);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`Report: ${output}`);
  console.log(`Temporary local data retained outside the repository: ${runDir}`);
}
