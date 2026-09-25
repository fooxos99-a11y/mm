import { defineAsyncComponent } from 'vue';

const lazyView = (loader) => defineAsyncComponent(loader);

export const AdminAssessmentView = lazyView(() => import(/* webpackChunkName: "admin-assessment" */ '../../views/AdminAssessmentView.vue'));
export const AdminTasksView = lazyView(() => import(/* webpackChunkName: "admin-tasks" */ '../../views/AdminTasksView.vue'));
export const AdminFinalExamView = lazyView(() => import(/* webpackChunkName: "admin-final-exam" */ '../../views/AdminFinalExamView.vue'));
export const AdminPeopleView = lazyView(() => import(/* webpackChunkName: "admin-people" */ '../../views/AdminPeopleView.vue'));
export const AdminCommunicationsView = lazyView(() => import(/* webpackChunkName: "admin-communications" */ '../../views/AdminCommunicationsView.vue'));
export const AdminTrainingMaterialsView = lazyView(() => import(/* webpackChunkName: "admin-training-materials" */ '../../views/AdminTrainingMaterialsView.vue'));
export const AdminResultsView = lazyView(() => import(/* webpackChunkName: "admin-results" */ '../../views/AdminResultsView.vue'));
export const AdminCompletionRequirementsView = lazyView(() => import(/* webpackChunkName: "admin-completion-requirements" */ '../../views/AdminCompletionRequirementsView.vue'));
export const AdminSatisfactionView = lazyView(() => import(/* webpackChunkName: "admin-satisfaction" */ '../../views/AdminSatisfactionView.vue'));
export const AdminPermissionsView = lazyView(() => import(/* webpackChunkName: "admin-permissions" */ '../../views/AdminPermissionsView.vue'));
export const AdminArchiveView = lazyView(() => import(/* webpackChunkName: "admin-archive" */ '../../views/AdminArchiveView.vue'));
export const AdminSettingsView = lazyView(() => import(/* webpackChunkName: "admin-settings" */ '../../views/AdminSettingsView.vue'));
