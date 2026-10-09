import { test as base, expect } from '@playwright/test';
import { copyFileSync, existsSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export const test = base.extend({
  assessmentDatabaseIsolation: [async ({}, use, info) => {
    const database = path.resolve(process.env.DB_DATABASE || '.');
    const tempRoot = realpathSync(os.tmpdir()).toLowerCase();
    if (process.env.DB_CONNECTION !== 'sqlite'
      || path.dirname(database).toLowerCase() !== tempRoot
      || !/^momars-e2e-\d+\.sqlite$/.test(path.basename(database))
      || !existsSync(database) || info.config.workers !== 1) {
      throw new Error('Browser isolation requires the runner-owned temporary SQLite database and one worker.');
    }
    const storage = path.resolve(process.env.LARAVEL_STORAGE_PATH || '.');
    if (path.dirname(storage).toLowerCase() !== tempRoot || !/^momars-e2e-storage-\d+$/.test(path.basename(storage))) {
      throw new Error('Browser isolation requires runner-owned temporary storage.');
    }
    const template = path.resolve(process.env.E2E_DATABASE_TEMPLATE || '.');
    const runnerId = path.basename(database).match(/^momars-e2e-(\d+)\.sqlite$/)[1];
    if (path.dirname(template).toLowerCase() !== tempRoot
      || path.basename(template) !== `momars-e2e-template-${runnerId}.sqlite` || !existsSync(template)) {
      throw new Error('Browser isolation requires the runner-owned seeded template.');
    }
    // Reuse the fully migrated seed, without retaining writes from earlier journeys.
    for (const suffix of ['-wal', '-shm']) rmSync(`${database}${suffix}`, { force: true });
    copyFileSync(template, database);
    rmSync(path.join(storage, 'app/registration-request-metadata.json'), { force: true });
    await use();
  }, { auto: true }],
});
export { expect };
