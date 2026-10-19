<template>
  <AppWorkspaceTopbar
    :admin-name="adminName"
    :menu-open="menuOpen"
    :class="{
      'dashboard-topbar--assessment': ['courses', 'tasks', 'finalexam'].includes(activeMenu),
    }"
    @toggle-menu="$emit('toggle-menu')"
  >
    <AppActionBar
      v-if="activeMenu === 'completion'"
      class="dashboard-topbar__actions"
    >
      <AppButton
        v-if="completionState.canEditSettings"
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
        @click="$emit('open-completion-settings')"
      >
        متطلبات الاجتياز
      </AppButton>
      <AppButton
        v-if="completionState.canCloseResults"
        variant="primary"
        class="dashboard-topbar__action"
        @click="$emit('open-completion-close')"
      >
        {{ completionState.isClosed ? 'إعادة فتح النتائج' : 'إغلاق واعتماد النتائج' }}
      </AppButton>
    </AppActionBar>

    <AppActionBar
      v-if="activeMenu === 'satisfaction' || (activeMenu === 'users' && canCreateUsers)"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="primary"
        class="dashboard-topbar__action"
        :disabled="(activeMenu === 'users' && panelLoading) || (activeMenu === 'satisfaction' && !canEditSatisfaction)"
        @click="$emit(activeMenu === 'users' ? 'add-user' : 'add-satisfaction')"
      >
        إضافة
      </AppButton>
    </AppActionBar>

    <AppActionBar
      v-if="activeMenu === 'settings' && selectedSetting === 'archive'"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
        @click="$emit('archive-all')"
      >
        أرشفة المحتوى الحالي
      </AppButton>
      <AppButton
        variant="primary"
        class="dashboard-topbar__action"
        @click="$emit('create-archive')"
      >
        إضافة
      </AppButton>
    </AppActionBar>

    <AppActionBar
      v-if="activeMenu === 'settings' && selectedSetting === 'registration'"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
        :disabled="registrationState.loading"
        @click="$emit('copy-registration-link')"
      >
        نسخ الرابط
      </AppButton>
      <AppButton
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
        @click="$emit('open-registration-fields')"
      >
        بيانات التسجيل
      </AppButton>
      <AppButton
        variant="primary"
        class="dashboard-topbar__action"
        :loading="registrationState.loading"
        @click="$emit('toggle-registration')"
      >
        {{ registrationState.isOpen ? 'إغلاق التسجيل' : 'فتح التسجيل' }}
      </AppButton>
    </AppActionBar>

    <div
      v-if="showCountdown || showAssessmentAction || activeMenu === 'finalexam'"
      class="dashboard-topbar__assessment-controls"
    >
      <div
        v-if="showCountdown"
        class="dashboard-topbar__timer-list"
      >
        <div
          v-for="timer in countdownItems"
          :key="`${activeMenu}-${timer.branchCode || 'all'}-${timer.closesAt || 'none'}`"
          class="dashboard-topbar__timer"
          role="timer"
          :aria-label="`${timer.text} ${timer.label}`"
          :title="timer.text"
        >
          <span class="dashboard-topbar__timer-text">{{ timer.branchLabel || 'المتبقي' }}</span>
          <span class="dashboard-topbar__timer-label">{{ timer.label }}</span>
        </div>
      </div>
      <AppActionBar
        v-if="showAssessmentAction"
        class="dashboard-topbar__actions"
      >
        <AppButton
          variant="primary"
          class="dashboard-topbar__action"
          @click="$emit('assessment-action')"
        >
          {{ assessmentState.label }}
        </AppButton>
      </AppActionBar>
      <AppActionBar
        v-if="activeMenu === 'finalexam'"
        class="dashboard-topbar__actions"
      >
        <AppButton
          variant="primary"
          class="dashboard-topbar__action"
          :disabled="!canOpenFinalExam"
          @click="$emit('toggle-final-exam')"
        >
          {{ finalExamState.isEnabled ? 'إيقاف الاختبار' : 'بدء' }}
        </AppButton>
        <AppButton
          variant="secondary"
          class="dashboard-topbar__action dashboard-topbar__action--ghost"
          :disabled="!canEditFinalExam"
          @click="$emit('copy-final-exam')"
        >
          نسخ
        </AppButton>
      </AppActionBar>
    </div>

    <AppActionBar
      v-if="activeMenu === 'overview' && overviewActions.length"
      id="quick-links"
      class="dashboard-topbar__actions dashboard-topbar__actions--overview"
    >
      <AppButton
        v-for="action in overviewActions"
        :key="action.id"
        variant="secondary"
        class="dashboard-overview-action"
        :disabled="panelLoading || overviewDialogLoading"
        @click="$emit('overview-action', action)"
      >
        <v-icon small>
          {{ action.icon }}
        </v-icon>
        <span>{{ action.label }}</span>
      </AppButton>
    </AppActionBar>
  </AppWorkspaceTopbar>
</template>

<script>
import { AppActionBar, AppButton } from '../ui';
import AppWorkspaceTopbar from '../ui/AppWorkspaceTopbar.vue';

export default {
  name: 'DashboardTopbar',
  components: { AppActionBar, AppButton, AppWorkspaceTopbar },
  props: {
    activeMenu: { type: String, required: true },
    adminName: { type: String, default: '' },
    canCreateUsers: { type: Boolean, default: false },
    canEditSatisfaction: { type: Boolean, default: true },
    canEditFinalExam: { type: Boolean, default: true },
    canOpenFinalExam: { type: Boolean, default: true },
    assessmentState: { type: Object, required: true },
    completionState: { type: Object, required: true },
    countdownItems: { type: Array, default: () => [] },
    finalExamState: { type: Object, required: true },
    menuOpen: { type: Boolean, default: false },
    overviewActions: { type: Array, default: () => [] },
    overviewDialogLoading: { type: Boolean, default: false },
    panelLoading: { type: Boolean, default: false },
    registrationState: { type: Object, required: true },
    selectedSetting: { type: String, default: '' },
    showAssessmentAction: { type: Boolean, default: false },
    showCountdown: { type: Boolean, default: false },
  },
  emits: [
    'toggle-menu',
    'open-completion-settings',
    'open-completion-close',
    'add-satisfaction',
    'add-user',
    'archive-all',
    'create-archive',
    'copy-registration-link',
    'open-registration-fields',
    'toggle-registration',
    'assessment-action',
    'overview-action',
    'copy-final-exam',
    'toggle-final-exam',
  ],
};
</script>

<style scoped>
.dashboard-topbar.dashboard-topbar--assessment { flex-wrap: wrap; gap: 12px; padding: 12px 16px; border-radius: var(--app-radius-card); }
.dashboard-topbar.dashboard-topbar--assessment { min-height: calc(var(--app-control-height) + 26px); }
.dashboard-topbar__assessment-controls { display: flex; align-items: center; gap: 12px; min-width: 0; }
.dashboard-topbar .dashboard-topbar__assessment-controls .dashboard-topbar__timer-list { display: grid; gap: 4px; min-width: 0; }
.dashboard-topbar .dashboard-topbar__assessment-controls .dashboard-topbar__timer { justify-content: space-between; min-height: 32px; padding: 4px 8px; font-size: .8rem; border-radius: 8px; }
@media (max-width: 700px) {
  .dashboard-topbar__assessment-controls { display: contents; }
  .dashboard-topbar .dashboard-topbar__assessment-controls .dashboard-topbar__timer-list { display: flex; flex: 1 0 100%; flex-wrap: wrap; order: 1; }
  .dashboard-topbar .dashboard-topbar__assessment-controls .dashboard-topbar__actions { flex: 0 0 auto; flex-wrap: nowrap; margin-inline-start: auto; min-width: 0; }
  .dashboard-topbar .dashboard-topbar__assessment-controls .dashboard-topbar__action { width: auto; min-width: 0; white-space: nowrap; }
}
</style>
