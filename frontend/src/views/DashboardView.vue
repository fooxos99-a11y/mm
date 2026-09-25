<template>
  <div class="dashboard-page">
    <DashboardSidebar
      :open="mobileMenuOpen"
      :items="dashboardMenu"
      :loading="panelLoading"
      :settings-open="settingsMenuOpen"
      :settings-items="settingsItems"
      :selected-setting="selectedSettingsItemId"
      :active-menu="activeMenu"
      :is-active="isMenuItemActive"
      @select="handleMenu"
      @select-setting="openSettingsItem"
      @close="mobileMenuOpen = false"
    />

    <main class="dashboard-main">
      <DashboardTopbar
        :active-menu="activeMenu"
        :admin-name="adminName"
        :assessment-state="assessmentTopbarState"
        :completion-state="completionTopbarState"
        :countdown-items="topbarCountdownItems"
        :final-exam-state="finalExamTopbarState"
        :menu-open="mobileMenuOpen"
        :overview-actions="overviewTopActions"
        :overview-dialog-loading="overviewDialogLoading"
        :panel-loading="panelLoading"
        :permissions-state="permissionsTopbarState"
        :registration-state="registrationTopbarState"
        :selected-setting="selectedSettingsItemId"
        :show-assessment-action="showAssessmentTopbarAction"
        :show-countdown="showTopbarCountdown"
        @toggle-menu="mobileMenuOpen = !mobileMenuOpen"
        @open-completion-settings="openCompletionRequirementsDialog"
        @open-completion-close="openCompletionCloseDialog"
        @toggle-permissions="togglePermissionsWorkspaceSection"
        @add-satisfaction="openSatisfactionWorkspaceAddDialog"
        @archive-all="openArchiveWorkspaceArchiveAllDialog"
        @create-archive="openArchiveWorkspaceCreateDialog"
        @copy-registration-link="copyRegistrationWorkspaceLink"
        @open-registration-fields="openRegistrationWorkspaceFieldsDialog"
        @toggle-registration="toggleRegistrationWorkspaceState"
        @assessment-action="triggerAssessmentTopbarAction"
        @overview-action="handleOverviewAction"
        @copy-final-exam="triggerFinalExamCopy"
        @toggle-final-exam="openFinalExamActivationDialog"
      />

      <div
        v-if="dashboardError"
        class="dashboard-error"
      >
        تعذر تحميل بيانات لوحة التحكم: {{ dashboardError }}
      </div>

      <section
        v-if="showDashboardLoader"
        class="dashboard-loader-shell"
      >
        <div class="dashboard-loader-shell__inner">
          <div
            class="loader"
            aria-hidden="true"
          />
        </div>
      </section>

      <DashboardOverviewPanel
        v-else-if="dashboardSnapshot && activeMenu === 'overview'"
        v-model:selected-branch="selectedOverviewBranch"
        :branch-options="overviewBranchOptions"
        :show-branch-filter="showOverviewBranchFilter"
        :indicators="dashboardIndicators"
        :indicator-style="indicatorStyle"
        :animated-display="animatedIndicatorDisplay"
      />

      <section
        v-else-if="dashboardSnapshot && (['users', 'results'].includes(activeMenu) || dashboardSnapshot.snapshotMode !== 'shell')"
        class="dashboard-workspace-panel"
        :class="{
          'dashboard-workspace-panel--assessment': isAssessmentWorkspace,
          'dashboard-workspace-panel--communications': isCommunicationsWorkspace,
          'dashboard-workspace-panel--registration': isRegistrationWorkspace,
        }"
      >
        <component
          :is="currentWorkspaceComponent"
          ref="workspacePanel"
          v-bind="currentWorkspaceProps"
          @assessment-topbar-state="handleAssessmentTopbarState"
          @final-exam-topbar-state="handleFinalExamTopbarState"
          @permissions-topbar-state="handlePermissionsTopbarState"
          @completion-topbar-state="handleCompletionTopbarState"
          @registration-topbar-state="handleRegistrationTopbarState"
          @open-dialog-item="handleSettingsDialogItem"
        />
      </section>

      <DashboardUtilityDialogs
        :links-open="linksDialogOpen"
        :links="directAccessLinks"
        :add-open="satisfactionAddDialogOpen"
        :delete-open="satisfactionDeleteDialogOpen"
        :question-draft="satisfactionQuestionDraft"
        :question-types="satisfactionQuestionTypeOptions"
        :question-options="satisfactionQuestionOptions"
        :selected-delete-key="selectedSatisfactionDeleteKey"
        :submitting="satisfactionSubmitting"
        :deleting="satisfactionDeleting"
        @update:links-open="linksDialogOpen = $event"
        @copy-link="copyDirectAccessLink"
        @update:add-open="satisfactionAddDialogOpen = $event"
        @update:delete-open="satisfactionDeleteDialogOpen = $event"
        @update-prompt="satisfactionQuestionDraft.prompt = $event"
        @update-type="satisfactionQuestionDraft.type = $event"
        @update-required="satisfactionQuestionDraft.isRequired = $event"
        @update:selected-delete-key="selectedSatisfactionDeleteKey = $event"
        @close-add="closeSatisfactionAddDialog"
        @submit-add="submitSatisfactionQuestion"
        @close-delete="closeSatisfactionDeleteDialog"
        @confirm-delete="confirmDeleteSatisfactionQuestion"
      />

      <DashboardManagementDialogs
        v-model:admins-open="adminsDialogOpen"
        v-model:templates-open="templatesDialogOpen"
        v-model:selected-course-id="selectedTemplateCourseId"
        :course-options="courseDialogOptions"
        :draft="templateDraft"
        :submitting="templatesSubmitting"
        @close-admins="resetAdminDialog"
        @accounts-busy="setAccountsPanelBusy"
        @update-template="updateTemplateDraft"
        @save-templates="saveNotificationTemplates"
      />
    </main>
  </div>
</template>

<script src="../features/dashboard/dashboardView.js"></script>

<style src="../styles/views/dashboard.css"></style>
<style src="../styles/views/dashboard-satisfaction.css"></style>
<style src="../styles/views/dashboard-management.css"></style>
<style src="../styles/views/dashboard-responsive.css"></style>
