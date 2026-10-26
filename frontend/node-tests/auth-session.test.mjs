import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { authMutations, createAuthState } from '../src/store/modules/storeState.mjs';
import { resolveLoginDestination } from '../src/utils/authRoutes.js';

const source = await readFile(new URL('../src/store/modules/auth.js', import.meta.url), 'utf8');
const module = await import(`data:text/javascript;base64,${Buffer.from(`
let fetcher;
export const setup = (fn) => { fetcher = fn; };
const fetchCurrentUser = () => fetcher();
const applyApiUserContext = () => {};
` + source.slice(source.indexOf('const sessionRequests'))).toString('base64')}`);
const context = () => {
  const state = createAuthState();
  return { state, commit(name, value) { if (authMutations[name]) authMutations[name](state, value); } };
};

test('concurrent session checks share one request and commit a confirmed account', async () => {
  const ctx = context(); let release; let calls = 0;
  module.setup(() => { calls++; return new Promise((resolve) => { release = resolve; }); });
  const one = module.authActions.bootstrapAuth(ctx);
  const two = module.authActions.bootstrapAuth(ctx, { force: true });
  release({ id: 'a' }); await Promise.all([one, two]);
  assert.equal(calls, 1); assert.equal(ctx.state.currentUser.id, 'a');
  assert.equal(ctx.state.authChecked, true); assert.equal(ctx.state.authLoading, false);
});

test('an outage retries once and keeps a known account unresolved until recovery', async () => {
  const ctx = context(); ctx.state.currentUser = { id: 'a' }; ctx.state.authChecked = true;
  let calls = 0;
  module.setup(async () => { calls++; throw { response: { status: 503 } }; });
  await module.authActions.bootstrapAuth(ctx, { force: true });
  assert.equal(calls, 2); assert.equal(ctx.state.currentUser.id, 'a');
  assert.equal(ctx.state.authChecked, false); assert.match(ctx.state.authError, /تحقق من الاتصال/);
  module.setup(async () => ({ id: 'a' }));
  await module.authActions.bootstrapAuth(ctx);
  assert.equal(ctx.state.authChecked, true); assert.equal(ctx.state.authError, '');
});

test('only confirmed missing or unauthorized sessions clear identity', async () => {
  for (const result of ['null', '401']) {
    const ctx = context(); ctx.state.currentUser = { id: 'old' }; let calls = 0;
    module.setup(async () => { calls++; if (result === '401') throw { response: { status: 401 } }; return null; });
    await module.authActions.bootstrapAuth(ctx);
    assert.equal(ctx.state.currentUser, null); assert.equal(ctx.state.authChecked, true); assert.equal(calls, 1);
  }
});

test('late session responses cannot restore a logged out account or overwrite a newer identity', async () => {
  for (const nextUser of [null, { id: 'new' }]) {
    const ctx = context(); let release;
    module.setup(() => new Promise((resolve) => { release = resolve; }));
    const pending = module.authActions.bootstrapAuth(ctx);
    ctx.commit('setAuthState', { user: nextUser }); ctx.commit('setAuthChecked', true);
    release({ id: 'old' }); await pending;
    assert.deepEqual(ctx.state.currentUser, nextUser);
  }
});

test('login destinations preserve local queries and reject external and recursive routes', () => {
  const router = { resolve: (path) => ({ fullPath: path, name: path.startsWith('/login') ? 'login' : path === '/missing' ? 'not-found' : 'student', matched: [{}], query: path.includes('login=1') ? { login: '1' } : {} }) };
  const account = { role: 'student' };
  assert.equal(resolveLoginDestination(router, '/student?section=parts#details', account), '/student?section=parts#details');
  for (const path of ['https://example.com', '//example.com', '/login', '/missing', '/practitioner?login=1', '/\\example.com', '/student' + String.fromCharCode(10)]) {
    assert.deepEqual(resolveLoginDestination(router, path, account), { name: 'student' });
  }
});
