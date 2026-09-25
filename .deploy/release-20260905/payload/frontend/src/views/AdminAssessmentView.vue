<template>
  <div
    class="assessment-page"
    :class="{ 'assessment-page--embedded': embedded }"
  >
    <div
      v-if="showQuestionDetails"
      class="assessment-page__glow assessment-page__glow--one"
    />
    <div
      v-if="showQuestionDetails"
      class="assessment-page__glow assessment-page__glow--two"
    />

    <v-container class="assessment-page__container py-8 py-md-12">
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
        :pre-value="animatedIndicatorDisplay(assessmentPreIndicatorValueLabel)"
        :pre-meta="assessmentPreIndicatorMetaLabel"
        :pre-style="preIndicatorStyle"
        :post-value="animatedIndicatorDisplay(assessmentPostIndicatorValueLabel)"
        :post-meta="assessmentPostIndicatorMetaLabel"
        :post-style="postIndicatorStyle"
        :score-diff-label="assessmentScoreDiffLabel"
        :score-diff-class="assessmentScoreDiffClass"
        :save-status="saveStatusText"
        :saving-attendance="isSavingAttendance"
        :attendance-branch="attendanceBranchId"
        :attendance-branch-options="assessmentBranchOptions.filter((option) => option.value !== 'all')"
        :students="displayedAttendanceStudents"
        :checked-ids="attendanceChecked"
        :checked-count="visibleCheckedCount"
        :all-checked="allVisibleChecked"
        @update:course-value="courseSelectValue = $event"
        @update:view-mode="viewMode = $event"
        @update:indicator-branch="assessmentIndicatorsBranch = $event"
        @update:attendance-branch="attendanceBranchId = $event"
        @create-course="openCourseCreateDialog"
        @edit-course="openCourseEditDialog"
        @move-course="moveManagedCourse"
        @delete-course="requestManagedCourseDelete"
        @toggle-all="toggleVisibleAttendance"
        @toggle-student="toggleAttendance"
      />

      <template v-else-if="hasCourseSelectionUi">
        <AssessmentDocumentWorkspace
          v-if="isDocumentMode"
          :toolbar-props="courseToolbarProps"
          :template-draft="templateDraft"
          :template-saving="templateSaving"
          :can-edit="canEditQuestions"
          @update:course-value="courseSelectValue = $event"
          @update:view-mode="viewMode = $event"
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
          <article class="assessment-card">
            <AssessmentCourseToolbar
              v-bind="courseToolbarProps"
              :show-description="isTasksPage"
              @update:course-value="courseSelectValue = $event"
              @update:view-mode="viewMode = $event"
              @update:task-points="handleTaskPointsInput"
              @update:task-video-url="taskVideoUrlDraft = $event.trim()"
              @update:task-description="taskDescriptionDraft = $event"
              @create-course="openCourseCreateDialog"
              @edit-course="openCourseEditDialog"
              @move-course="moveManagedCourse"
              @delete-course="requestManagedCourseDelete"
            />

            <AssessmentExistingQuestionList
              v-if="selectedCourse"
              :questions="selectedQuestions"
              :drafts="questionDrafts"
              :errors="questionDraftErrors"
              :empty-text="isTasksPage ? 'لا توجد أسئلة بعد. استخدم + لإضافة خيارات أو نصي أو صح وخطأ، أو اختر وورد.' : 'لا توجد أسئلة بعد.'"
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
              @update-form="updateForm"
              @clear-error="clearFormError"
              @prompt-paste="handlePromptPaste"
              @option-change="handleOptionChange"
              @option-paste="handleOptionPaste"
              @select-correct="selectCorrectOption"
              @add-option="handleAddOptionField"
              @remove-form="handleRemoveQuestionSlot"
              @add-question="handleAddQuestionSlot"
              @save="handleSaveAllQuestions"
            />
          </article>
        </section>
      </template>

      <section
        v-else
        class="assessment-empty-shell"
      >
        <h1 class="assessment-empty-message">
          {{ isTasksPage ? 'لا توجد مهام أدائية متاحة' : 'لا توجد دورات متاحة' }}
        </h1>
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
<style src="../styles/components/assessment-question-editor.css"></style>
<style src="../styles/components/assessment-management-dialogs.css"></style>
