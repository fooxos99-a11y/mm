<template>
  <div
    class="assessment-page"
    :class="{ 'assessment-page--embedded': embedded }"
  >
    <v-container class="assessment-page__container py-8 py-md-12">
      <h1 class="d-sr-only">
        {{ isIndicatorsMode ? 'مؤشرات الاختبارات' : isAttendanceMode ? 'تحضير المعلمين' : assessmentLabels[detailAssessmentType] }}
      </h1>
      <header
        v-if="!embedded && canShowAssessmentStartButton"
        class="assessment-standalone-header"
      >
        <AppButton
          variant="primary"
          :disabled="currentAssessmentActionType === 'attendance' && attendanceActionState.disabled"
          @click="handleCurrentAssessmentAvailabilityAction"
        >
          {{ currentAssessmentActionLabel }}
        </AppButton>
      </header>
      <div
        v-if="!embedded"
        class="assessment-page__mobile-back"
      >
        <AppIconButton
          variant="primary"
          class="assessment-mobile-back"
          aria-label="العودة"
          @click="navigateBack"
        >
          <v-icon small>
            mdi-arrow-right
          </v-icon>
        </AppIconButton>
      </div>

      <div
        v-if="!embedded && !isTasksPage"
        class="assessment-tabs"
      >
        <AppChoiceButton
          v-for="type in ['pre', 'post']"
          :key="type"
          variant="tab"
          class="assessment-tabs__item"
          :active="type === assessmentType"
          @click="switchAssessmentType(type)"
        >
          {{ assessmentLabels[type] }}
        </AppChoiceButton>
      </div>

      <v-alert
        v-if="dashboardError"
        type="error"
        outlined
        class="assessment-alert mb-6"
      >
        {{ dashboardError }}
      </v-alert>

      <AssessmentOperationalPanels
        v-if="showUnifiedToolbar && (isIndicatorsMode || isAttendanceMode)"
        ref="operationalPanels"
        :mode="isIndicatorsMode ? 'indicators' : 'attendance'"
        :course-value="courseSelectValue"
        :course-options="courseSelectOptions"
        :course-placeholder="coursePlaceholderLabel"
        :view-mode="viewMode"
        :mode-options="courseModeOptions"
        :can-edit="isAttendanceMode && canEditAttendance"
        :can-manage-catalog="canManageCourseCatalog"
        :deleting-course-id="deletingCourseId"
        :managed-branch-id="managedBranchId"
        :indicator-branch="assessmentIndicatorsBranch"
        :indicator-branch-options="assessmentIndicatorsBranchOptions"
        :selected-course="selectedCourse"
        :total-students="assessmentIndicatorsTotalStudents"
        :pre-value="assessmentPreIndicatorValueLabel"
        :pre-indicator="assessmentPreIndicator"
        :post-value="assessmentPostIndicatorValueLabel"
        :post-indicator="assessmentPostIndicator"
        :score-difference="assessmentScoreDiff"
        :loading="dashboardLoading"
        :changing-context="isChangingAssessmentContext"
        :save-status="saveStatusText"
        :saving-attendance="isSavingAttendance || Boolean(attendanceSaveTimer)"
        :attendance-branch="attendanceBranchId"
        :attendance-branch-options="assessmentBranchOptions.filter((option) => option.value !== 'all')"
        :students="displayedAttendanceStudents"
        :checked-ids="attendanceChecked"
        :selected-session="selectedAttendanceSession"
        :show-session-action="false"
        :all-checked="allVisibleChecked"
        @select-session="selectedAttendanceSession = $event; attendanceRemovedIds = []"
        @attendance-action-state="attendanceActionState = $event"
        @update:course-value="courseSelectValue = $event"
        @update:view-mode="requestViewModeChange($event)"
        @update:indicator-branch="assessmentIndicatorsBranch = $event"
        @update:attendance-branch="requestAttendanceBranchChange($event)"
        @create-course="openCourseCreateDialog"
        @edit-course="openCourseEditDialog"
        @move-course="moveManagedCourse"
        @delete-course="requestManagedCourseDelete"
        @toggle-all="toggleVisibleAttendance"
        @toggle-student="toggleAttendance"
        @save-attendance="saveAttendanceNow"
      />

      <template v-else-if="hasCourseSelectionUi">
        <AssessmentDocumentWorkspace
          v-if="isDocumentMode"
          :toolbar-props="courseToolbarProps"
          :template-draft="templateDraft"
          :template-saving="templateSaving"
          :has-changes="hasAssessmentChanges"
          :can-edit="canEditQuestions"
          @update:course-value="courseSelectValue = $event"
          @update:view-mode="requestViewModeChange($event)"
          @update:task-points="handleTaskPointsInput"
          @update:task-video-url="taskVideoUrlDraft = $event.trim()"
          @update:task-description="taskDescriptionDraft = $event"
          @update:template-draft="templateDraft = $event"
          @create-course="openCourseCreateDialog"
          @edit-course="openCourseEditDialog"
          @move-course="moveManagedCourse"
          @delete-course="requestManagedCourseDelete"
          @save-template="saveTemplate"
        />

        <section
          v-else
          class="assessment-layout"
        >
          <AppCard
            class="assessment-card admin-workspace-card"
            tag="article"
          >
            <AssessmentCourseToolbar
              v-bind="courseToolbarProps"
              :show-description="isTasksPage"
              @update:course-value="courseSelectValue = $event"
              @update:view-mode="requestViewModeChange($event)"
              @update:task-points="handleTaskPointsInput"
              @update:task-video-url="taskVideoUrlDraft = $event.trim()"
              @update:task-description="taskDescriptionDraft = $event"
              @create-course="openCourseCreateDialog"
              @edit-course="openCourseEditDialog"
              @move-course="moveManagedCourse"
              @delete-course="requestManagedCourseDelete"
            />
            <AssessmentEditorHeader
              v-if="selectedCourse"
              :questions="editorQuestions"
              @navigate="scrollToEditorQuestion"
            />

            <AppLoadingSpinner
              v-if="dashboardLoading"
              label="جارٍ تحميل الأسئلة"
            />

            <AssessmentExistingQuestionList
              v-if="selectedCourse && (visibleSelectedQuestions.length || !questionForms.length)"
              :questions="visibleSelectedQuestions"
              :drafts="questionDrafts"
              :errors="questionDraftErrors"
              :allow-option-removal="true"
              :can-edit="canEditQuestions"
              :saving="isSaving"
              @remove="removeQuestion"
              @update-draft="updateQuestionDraft"
              @clear-error="clearQuestionDraftError"
              @prompt-paste="handleExistingPromptPaste"
              @option-change="handleExistingOptionChange"
              @option-paste="handleExistingOptionPaste"
              @select-correct="selectExistingCorrectOption"
              @add-option="handleExistingAddOptionField"
              @remove-option="removeExistingOption"
            />

            <AssessmentQuestionBuilder
              v-if="canEditQuestions && selectedCourse"
              :forms="questionForms"
              :errors="questionErrors"
              :existing-count="visibleSelectedQuestions.length"
              :is-tasks-page="isTasksPage"
              :has-existing-questions="selectedQuestions.length > 0"
              :is-document-mode="isDocumentMode"
              :saving="isSaving"
              :allow-option-removal="true"
              :has-changes="hasAssessmentChanges"
              @update-form="updateForm"
              @clear-error="clearFormError"
              @prompt-paste="handlePromptPaste"
              @option-change="handleOptionChange"
              @option-paste="handleOptionPaste"
              @select-correct="selectCorrectOption"
              @add-option="handleAddOptionField"
              @remove-option="removeNewOption"
              @remove-form="handleRemoveQuestionSlot"
              @add-question="handleAddQuestionSlot"
              @save="handleSaveAllQuestions"
            />
          </AppCard>
        </section>
      </template>

      <section
        v-else
        class="assessment-empty-shell"
      >
        <h2 class="assessment-empty-message">
          {{ isTasksPage ? 'لا توجد مهام أدائية متاحة' : 'لا توجد دورات متاحة' }}
        </h2>
      </section>

      <AssessmentCourseDialogs
        v-model:create-open="courseCreateDialogOpen"
        v-model:create-title="courseCreateTitle"
        v-model:template-draft="courseCreateTemplateDraft"
        v-model:edit-open="courseEditDialogOpen"
        v-model:edit-title="courseEditTitle"
        v-model:delete-open="courseDeleteDialogOpen"
        :create-video-url="courseCreateVideoUrlDraft"
        :create-description="courseCreateDescriptionDraft"
        :is-tasks-page="isTasksPage"
        :create-mode="courseCreateMode"
        :create-question-type="courseCreateQuestionType"
        :create-submitting="courseCreateSubmitting"
        :edit-submitting="courseEditSubmitting"
        :delete-title="courseDeleteTitle"
        :delete-submitting="assessmentDeleteSubmitting"
        @cancel-create="closeCourseCreateDialog"
        @submit-create="saveNewCourse"
        @update:create-video-url="courseCreateVideoUrlDraft = $event"
        @update:create-description="courseCreateDescriptionDraft = $event"
        @cancel-edit="closeCourseEditDialog"
        @submit-edit="saveCourseEdit"
        @cancel-delete="closeCourseDeleteDialog"
        @confirm-delete="confirmManagedCourseDelete"
      />

      <AssessmentEditorDialogs
        :discard-open="discardChangesDialogOpen"
        @resolve-discard="resolveDiscardChanges"
      />

      <AssessmentAvailabilityDialogs
        v-model:availability-open="assessmentAvailabilityDialogOpen"
        v-model:availability-branch="assessmentAvailabilityBranch"
        v-model:availability-minutes="assessmentAvailabilityMinutes"
        v-model:manage-open="assessmentManageDialogOpen"
        v-model:manage-choice="assessmentManageChoice"
        :availability-label="availabilityDialogLabel"
        :managed-branch-id="managedBranchId"
        :branch-options="assessmentBranchOptions"
        :availability-submitting="assessmentAvailabilitySubmitting"
        :manage-label="assessmentManageDialogLabel"
        :manage-options="currentAssessmentManageOptions"
        :manage-submitting="assessmentManageSubmitting"
        @cancel-availability="closeAssessmentAvailabilityDialog"
        @confirm-availability="confirmAssessmentAvailability"
        @cancel-manage="closeAssessmentManageDialog"
        @confirm-manage="confirmAssessmentManageAction"
      />
    </v-container>
  </div>
</template>

<script src="../features/assessment/adminAssessmentView.js"></script>

<style src="../styles/views/admin-assessment.css"></style>
<style src="../styles/views/admin-assessment-controls.css"></style>
<style src="../styles/views/admin-assessment-cards.css"></style>
<style src="../styles/views/admin-assessment-question-form.css"></style>
<style src="../styles/components/assessment-management-dialogs.css"></style>
<style scoped>
.assessment-standalone-header { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.assessment-page :deep(.prep-card), .assessment-page :deep(.assessment-card) { border-radius: var(--app-radius-card); box-shadow: var(--app-shadow-card); backdrop-filter: none; }
</style>
