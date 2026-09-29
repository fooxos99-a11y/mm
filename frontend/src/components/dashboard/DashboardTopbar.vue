<template>
  <header class="dashboard-topbar">
    <div class="dashboard-topbar__mobile">
      <AppIconButton
        variant="primary"
        class="dashboard-icon-button"
        aria-label="فتح القائمة"
        @click="$emit('toggle-menu')"
      >
        <v-icon>{{ menuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
      </AppIconButton>
    </div>
    <div class="dashboard-topbar__welcome">
      <div class="dashboard-topbar__label">
        مرحبًا
      </div>
      <div class="dashboard-topbar__name">
        {{ adminName }}
      </div>
    </div>

    <div
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
        :variant="completionState.isClosed ? 'secondary' : 'primary'"
        class="dashboard-topbar__action"
        @click="$emit('open-completion-close')"
      >
        {{ completionState.isClosed ? 'إعادة فتح النتائج' : 'إغلاق واعتماد النتائج' }}
      </AppButton>
    </div>

    <div
      v-if="activeMenu === 'settings' && selectedSetting === 'permissions' && permissionsState.isAdmin"
      class="dashboard-topbar__actions"
    >
      <AppChoiceButton
        variant="soft"
        :active="true"
        class="dashboard-topbar__action dashboard-topbar__action--choice"
        @click="$emit('toggle-permissions')"
      >
        {{ permissionsState.activeSection === 'supervision' ? 'الصلاحيات' : 'الإشراف' }}
      </AppChoiceButton>
    </div>

    <div
      v-if="activeMenu === 'satisfaction' || (activeMenu === 'users' && canCreateUsers)"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="primary"
        class="dashboard-topbar__action"
        :disabled="activeMenu === 'users' && panelLoading"
        @click="$emit(activeMenu === 'users' ? 'add-user' : 'add-satisfaction')"
      >
        إضافة
      </AppButton>
    </div>

    <div
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
    </div>

    <div
      v-if="activeMenu === 'settings' && selectedSetting === 'registration'"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
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
        :variant="registrationState.isOpen ? 'secondary' : 'success'"
        class="dashboard-topbar__action"
        :loading="registrationState.loading"
        @click="$emit('toggle-registration')"
      >
        {{ registrationState.isOpen ? 'إغلاق التسجيل' : 'فتح التسجيل' }}
      </AppButton>
    </div>

    <div
      v-if="showCountdown"
      class="dashboard-topbar__timer-list"
    >
      <div
        v-for="timer in countdownItems"
        :key="`${activeMenu}-${timer.branchCode || 'all'}-${timer.closesAt || 'none'}`"
        class="dashboard-topbar__timer"
      >
        <span class="dashboard-topbar__timer-text">{{ timer.text }}</span>
        <span class="dashboard-topbar__timer-label">{{ timer.label }}</span>
      </div>
    </div>

    <div
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
    </div>

    <div
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
    </div>

    <div
      v-if="activeMenu === 'finalexam'"
      class="dashboard-topbar__actions"
    >
      <AppButton
        variant="secondary"
        class="dashboard-topbar__action dashboard-topbar__action--ghost"
        @click="$emit('copy-final-exam')"
      >
        نسخ
      </AppButton>
      <AppButton
        variant="primary"
        class="dashboard-topbar__action"
        @click="$emit('toggle-final-exam')"
      >
        {{ finalExamState.isEnabled ? 'إيقاف الاختبار' : 'بدء' }}
      </AppButton>
    </div>
  </header>
</template>

<script>
import { AppButton, AppChoiceButton, AppIconButton } from '../ui';

export default {
  name: 'DashboardTopbar',
  components: { AppButton, AppChoiceButton, AppIconButton },
  props: {
    activeMenu: { type: String, required: true },
    adminName: { type: String, default: '' },
    canCreateUsers: { type: Boolean, default: false },
    assessmentState: { type: Object, required: true },
    completionState: { type: Object, required: true },
    countdownItems: { type: Array, default: () => [] },
    finalExamState: { type: Object, required: true },
    menuOpen: { type: Boolean, default: false },
    overviewActions: { type: Array, default: () => [] },
    overviewDialogLoading: { type: Boolean, default: false },
    panelLoading: { type: Boolean, default: false },
    permissionsState: { type: Object, required: true },
    registrationState: { type: Object, required: true },
    selectedSetting: { type: String, default: '' },
    showAssessmentAction: { type: Boolean, default: false },
    showCountdown: { type: Boolean, default: false },
  },
  emits: [
    'toggle-menu',
    'open-completion-settings',
    'open-completion-close',
    'toggle-permissions',
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
