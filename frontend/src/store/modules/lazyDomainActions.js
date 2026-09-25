const invoke = (loader, exportName, actionName) => async (context, payload) => {
  const domain = await loader();
  return domain[exportName][actionName](context, payload);
};

const course = () => import(/* webpackChunkName: "store-courses" */ './courses');
const feedback = () => import(/* webpackChunkName: "store-feedback" */ './feedback');
const people = () => import(/* webpackChunkName: "store-people" */ './people');
const communications = () => import(/* webpackChunkName: "store-communications" */ './communications');
const dashboard = () => import(/* webpackChunkName: "store-dashboard" */ './dashboard');
const auth = () => import(/* webpackChunkName: "store-auth" */ './auth');

const actionMap = (loader, exportName, actionNames) => Object.fromEntries(
  actionNames.map((name) => [name, invoke(loader, exportName, name)]),
);

export const lazyDomainActions = {
  ...actionMap(auth, 'authActions', ['bootstrapAuth', 'login', 'logout']),
  ...actionMap(dashboard, 'dashboardActions', [
    'loadDashboardSnapshot', 'refreshDashboardSnapshot', 'ensureDashboardSnapshot', 'initializeDashboard', 'initializeRealtime',
    'reloadNotifications',
  ]),
  ...actionMap(course, 'courseActions', [
    'setManualAttendance', 'submitAssessment', 'addCourse', 'addTaskTemplate',
    'updateTaskTemplate', 'updateCourse', 'deleteCourse', 'reorderCourses',
    'activateCourse', 'deactivateAllCourses', 'addQuestion', 'updateQuestion',
    'deleteQuestion', 'syncCourseQuestions', 'bulkImportAssessments',
  ]),
  ...actionMap(feedback, 'feedbackActions', [
    'addSatisfactionQuestion', 'deleteSatisfactionQuestion', 'deleteSatisfactionQuestions',
    'submitSatisfactionResponses', 'addFinalExamQuestion', 'updateFinalExamQuestion',
    'deleteFinalExamQuestion', 'toggleFinalExamEnabled', 'updateFinalExamNotificationTemplate',
    'submitFinalExam', 'copyFinalExamQuestions', 'setFinalExamManualScore',
  ]),
  ...actionMap(people, 'peopleActions', [
    'fetchDashboardAccounts', 'createDashboardAccount', 'deleteDashboardAccount',
    'addStudent', 'updateStudent', 'deleteStudent', 'saveReciter', 'deleteReciter',
    'setRolePermission',
  ]),
  ...actionMap(communications, 'communicationActions', [
    'addNotification', 'deleteNotification',
  ]),
};
