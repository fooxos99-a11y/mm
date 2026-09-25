import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';
import { resolveUserHomeRoute } from '../utils/authRoutes';
import {
  buildDashboardQuery,
  canAccessAdminRoute,
  resolveRedirectPath,
} from './accessPolicy.mjs';
import HomeView from '../views/HomeView.vue';

const PractitionerView = () => import(/* webpackChunkName: "public-practitioner" */ '../views/PractitionerView.vue');
const LoginView = () => import(/* webpackChunkName: "auth" */ '../views/LoginView.vue');
const ChangePasswordView = () => import(/* webpackChunkName: "auth" */ '../views/ChangePasswordView.vue');
const DashboardView = () => import(/* webpackChunkName: "dashboard" */ '../views/DashboardView.vue');
const AdminPeopleView = () => import(/* webpackChunkName: "dashboard-admin-people" */ '../views/AdminPeopleView.vue');
const AdminCommunicationsView = () => import(/* webpackChunkName: "dashboard-admin-communications" */ '../views/AdminCommunicationsView.vue');
const AdminResultsView = () => import(/* webpackChunkName: "dashboard-admin-results" */ '../views/AdminResultsView.vue');
const CourseView = () => import(/* webpackChunkName: "course" */ '../views/CourseView.vue');
const SatisfactionView = () => import(/* webpackChunkName: "satisfaction" */ '../views/SatisfactionView.vue');
const FinalExamView = () => import(/* webpackChunkName: "final-exam" */ '../views/FinalExamView.vue');
const TasksView = () => import(/* webpackChunkName: "tasks" */ '../views/TasksView.vue');
const StudentView = () => import(/* webpackChunkName: "student" */ '../views/StudentView.vue');
const TraineeView = () => import(/* webpackChunkName: "trainee" */ '../views/TraineeView.vue');
const ReciterView = () => import(/* webpackChunkName: "reciter" */ '../views/ReciterView.vue');
const RegistrationView = () => import(/* webpackChunkName: "registration" */ '../views/RegistrationView.vue');
const NotFoundView = () => import(/* webpackChunkName: "not-found" */ '../views/NotFoundView.vue');

let authBootstrapPromise = null;

const ensureAuthChecked = () => {
  if (store.state.authChecked) {
    return Promise.resolve();
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = store.dispatch('bootstrapAuth')
      .finally(() => { authBootstrapPromise = null; });
  }

  return authBootstrapPromise;
};

const trimQueryValue = (value) => (typeof value === 'string' ? value.trim() : '');
const routerBase = process.env.VUE_APP_ROUTER_BASE || '/';

const router = createRouter({
  history: createWebHistory(routerBase),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }

    return {
      left: 0,
      top: 0,
    };
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { lightweightShell: true },
    },
    {
      path: '/practitioner',
      name: 'practitioner',
      component: PractitionerView,
    },
    {
      path: '/registration',
      name: 'registration',
      component: RegistrationView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: ChangePasswordView,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, requiresDashboardAccess: true },
    },
    {
      path: '/courses/:assessmentType?',
      name: 'courses',
      component: CourseView,
      meta: { requiresAuth: true },
      props: (route) => ({
        assessmentType: route.params.assessmentType || route.query.assessmentType || 'post',
      }),
    },
    {
      path: '/course',
      component: CourseView,
      meta: { requiresAuth: true },
      props: {
        assessmentType: 'pre',
      },
    },
    {
      path: '/course/pre',
      component: CourseView,
      meta: { requiresAuth: true },
      props: {
        assessmentType: 'pre',
      },
    },
    {
      path: '/course/post',
      component: CourseView,
      meta: { requiresAuth: true },
      props: {
        assessmentType: 'post',
      },
    },
    {
      path: '/course/tasks',
      component: TasksView,
      meta: { requiresAuth: true },
    },
    {
      path: '/satisfaction',
      name: 'satisfaction',
      component: SatisfactionView,
      meta: { requiresAuth: true },
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView,
      meta: { requiresAuth: true },
    },
    {
      path: '/student',
      name: 'student',
      component: StudentView,
      meta: { requiresAuth: true },
    },
    {
      path: '/trainee',
      name: 'trainee',
      component: TraineeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/reciter',
      name: 'reciter',
      component: ReciterView,
      meta: { requiresAuth: true },
    },
    {
      path: '/final-exam',
      name: 'final-exam',
      component: FinalExamView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/assessments/:assessmentType',
      name: 'admin-assessment',
      redirect: (to) => {
        const assessmentType = trimQueryValue(to.params.assessmentType);
        const isTaskPanel = assessmentType === 'tasks';

        return {
          name: 'dashboard',
          query: buildDashboardQuery(isTaskPanel ? 'tasks' : 'courses', {
            assessmentType: isTaskPanel ? '' : assessmentType,
            courseId: to.query.courseId,
          }),
        };
      },
    },
    {
      path: '/admin/final-exam',
      name: 'admin-final-exam',
      redirect: () => ({
        name: 'dashboard',
        query: buildDashboardQuery('finalexam'),
      }),
    },
    {
      path: '/admin/people',
      name: 'admin-people',
      component: AdminPeopleView,
      meta: { requiresAuth: true, requiresDashboardAccess: true },
    },
    {
      path: '/admin/communications',
      name: 'admin-communications',
      component: AdminCommunicationsView,
      meta: { requiresAuth: true, requiresDashboardAccess: true },
    },
    {
      path: '/admin/results',
      name: 'admin-results',
      component: AdminResultsView,
      meta: { requiresAuth: true, requiresDashboardAccess: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  const requiresAuthResolution = to.matched.some((record) => (
    record.meta.requiresAuth || record.meta.guestOnly
  ));

  if (!store.state.authChecked && !requiresAuthResolution) {
    next();

    window.setTimeout(() => {
      ensureAuthChecked().then(() => {
        if (store.state.currentUser?.role !== 'student' && store.state.currentUser?.mustChangePassword && router.currentRoute.value.name !== 'change-password') {
          router.replace({ name: 'change-password' }).catch(() => {});
          return;
        }

        store.dispatch('initializeDashboard').catch(() => {});
      }).catch(() => {});
    }, 600);
    return;
  }

  if (!store.state.authChecked) {
    await ensureAuthChecked();
  }

  const redirectPath = resolveRedirectPath(to);

  if (store.state.currentUser?.role === 'student' && to.name === 'change-password') {
    next(resolveUserHomeRoute(store.state.currentUser));
    return;
  }

  if (store.state.currentUser?.role !== 'student' && store.state.currentUser?.mustChangePassword && to.name !== 'change-password') {
    next({ name: 'change-password' });
    return;
  }

  if (to.matched.some((record) => record.meta.requiresAuth) && !store.getters.isAuthenticated) {
    next({
      name: 'login',
      query: {
        ...(redirectPath ? { redirect: redirectPath } : {}),
      },
    });
    return;
  }

  if (to.matched.some((record) => record.meta.requiresDashboardAccess) && !canAccessAdminRoute(
    to,
    store.state.currentUser,
    store.state.dashboardSnapshot,
  )) {
    next(resolveUserHomeRoute(store.state.currentUser));
    return;
  }

  if (to.matched.some((record) => record.meta.guestOnly) && store.getters.isAuthenticated) {
    if (typeof to.query.redirect === 'string' && to.query.redirect) {
      next(to.query.redirect);
      return;
    }

    next(resolveUserHomeRoute(store.state.currentUser));
    return;
  }

  next();
});

export default router;
