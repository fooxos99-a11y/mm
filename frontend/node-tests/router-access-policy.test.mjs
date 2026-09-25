import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardQuery,
  canAccessAdminRoute,
  canAccessDashboard,
  getRolePermissions,
  hasOneOfPermissions,
  resolveRedirectPath,
} from '../src/router/accessPolicy.mjs';

const manager = { role: 'male_manager' };
const snapshot = {
  rolePermissions: {
    male_manager: {
      open_pre_exam: true,
      edit_post_questions: true,
      add_student: true,
      page_notifications: true,
      page_results: true,
    },
  },
};

test('dashboard access recognizes admins and both manager roles', () => {
  assert.equal(canAccessDashboard({ role: 'admin' }), true);
  assert.equal(canAccessDashboard(manager), true);
  assert.equal(canAccessDashboard({ role: 'female_manager' }), true);
  assert.equal(canAccessDashboard({ role: 'student' }), false);
  assert.deepEqual(getRolePermissions({ role: 'student' }, snapshot), {});
  assert.equal(hasOneOfPermissions([], manager, snapshot), false);
  assert.equal(hasOneOfPermissions(['page_results'], manager, snapshot), true);
});

test('manager route policy enforces the permission required by every panel', () => {
  assert.equal(canAccessAdminRoute({ name: 'dashboard' }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-assessment', params: { assessmentType: 'pre' } }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-assessment', params: { assessmentType: 'post' } }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-people' }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-communications' }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-results' }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-final-exam' }, manager, snapshot), false);
  assert.equal(canAccessAdminRoute({ name: 'unknown' }, manager, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-results' }, { role: 'student' }, snapshot), false);
  assert.equal(canAccessAdminRoute({ name: 'admin-final-exam' }, { role: 'admin' }, snapshot), true);
  assert.equal(canAccessAdminRoute({ name: 'admin-results' }, manager, {}), false);
});

test('redirect and dashboard query normalization discard unsafe empty navigation state', () => {
  assert.equal(resolveRedirectPath(), '');
  assert.equal(resolveRedirectPath({ fullPath: '/' }), '');
  assert.equal(resolveRedirectPath({ fullPath: '/login?redirect=x' }), '');
  assert.equal(resolveRedirectPath({ fullPath: '/dashboard?panel=people' }), '/dashboard?panel=people');
  assert.deepEqual(buildDashboardQuery('overview', { courseId: '  ', assessmentType: 5 }), {});
  assert.deepEqual(buildDashboardQuery('courses', { courseId: ' c1 ', assessmentType: 'pre' }), {
    panel: 'courses',
    courseId: 'c1',
    assessmentType: 'pre',
  });
});
