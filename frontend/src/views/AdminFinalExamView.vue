<template>
  <div
    class="final-exam-page"
    :class="{ 'final-exam-page--embedded': embedded }"
  >
    <v-container class="final-exam-page__container py-8 py-md-10">
      <v-alert
        v-if="dashboardError"
        type="error"
        outlined
        class="mb-6"
      >
        {{ dashboardError }}
      </v-alert>

      <section
        v-if="showBranchCards"
        class="assessment-cards-shell"
      >
        <article
          v-for="branch in branchOptions"
          :key="branch.value"
          class="assessment-course-card"
        >
          <div class="assessment-course-card__top">
            <div class="assessment-course-card__copy">
              <h2 class="assessment-course-card__title">
                {{ branch.label }}
              </h2>
            </div>
          </div>

          <div class="assessment-course-card__buttons">
            <AppChoiceButton
              block
              class="assessment-course-card__button"
              :active="selectedBranch === branch.value"
              @click="openBranchWorkspace(branch.value)"
            >
              تعديل الأسئلة
            </AppChoiceButton>
            <AppChoiceButton
              block
              class="assessment-course-card__button"
              :active="isBranchActive(branch.value)"
              @click="toggleBranchActivation(branch.value)"
            >
              {{ isBranchActive(branch.value) ? 'إيقاف الاختبار' : 'بدء الاختبار' }}
            </AppChoiceButton>
          </div>
        </article>
      </section>

      <section
        v-if="showBranchCards"
        class="assessment-indicators-card"
      >
        <div class="assessment-indicators-card__header">
          <h2 class="assessment-indicators-card__title">
            مؤشرات الاختبار النهائي
          </h2>
        </div>

        <div class="assessment-indicators-card__controls">
          <div
            v-if="!managedBranchId"
            class="assessment-indicators-card__filter-group"
          >
            <label class="assessment-indicators-card__label">الفرع</label>
            <AppSelect
              v-model="indicatorBranch"
              aria-label="الفرع"
              :items="branchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="assessment-select"
            />
          </div>
        </div>

        <div
          v-if="!finalExamIndicator.totalStudents"
          class="assessment-empty-state"
        >
          لا يوجد معلمون في هذا الفرع لعرض المؤشرات.
        </div>

        <div
          v-else
          class="assessment-indicators-panel assessment-indicators-panel--single"
        >
          <article class="assessment-score-indicator">
            <div
              class="assessment-score-indicator__ring"
              :style="finalExamIndicatorStyle"
            >
              <div class="assessment-score-indicator__ring-core">
                {{ animatedIndicatorDisplay(`${finalExamIndicator.percent}%`) }}
              </div>
            </div>
            <div class="assessment-score-indicator__text">
              <div class="assessment-score-indicator__subtitle">
                نسبة تقديم الاختبار النهائي
              </div>
              <div class="assessment-score-indicator__sublabel">
                {{ finalExamIndicator.submitted }} من {{ finalExamIndicator.totalStudents }} معلم
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        v-else
        class="final-exam-list-shell"
      >
        <div
          v-if="!managedBranchId"
          class="assessment-toolbar assessment-toolbar--embedded"
        >
          <div class="assessment-toolbar__field">
            <label class="assessment-toolbar__label">الفرع</label>
            <AppSelect
              v-model="selectedBranch"
              aria-label="الفرع"
              :items="branchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="assessment-select"
            />
          </div>
        </div>

        <AssessmentExistingQuestionList
          :questions="visibleBranchQuestions"
          :drafts="questionDrafts"
          :errors="questionDraftErrors"
          empty-text="لا توجد أسئلة بعد."
          can-edit
          :saving="isSaving"
          @remove="removeQuestion"
          @update-draft="updateQuestionDraft"
          @clear-error="clearQuestionDraftError"
          @option-change="handleExistingOptionChange"
          @select-correct="selectExistingCorrectOption"
          @add-option="handleExistingAddOptionField"
        />

        <AssessmentQuestionBuilder
          :forms="questionForms"
          :errors="questionErrors"
          :existing-count="visibleBranchQuestions.length"
          :saving="isSaving"
          @update-form="updateQuestionForm"
          @clear-error="clearQuestionError"
          @prompt-paste="handleBulkPaste"
          @option-change="handleOptionChange"
          @option-paste="handleOptionPaste"
          @select-correct="selectDraftCorrectOption"
          @add-option="handleAddOptionField"
          @remove-form="handleRemoveQuestionSlot"
          @add-question="handleAddQuestionSlot"
          @save="handleSaveAllQuestions"
        />
      </section>

      <FinalExamDialogs
        v-model:copy-open="copyDialogOpen"
        v-model:activation-open="activationDialogOpen"
        v-model:activation-branch="activationBranch"
        v-model:duration-minutes="openDurationMinutes"
        v-model:manage-open="manageDialogOpen"
        v-model:manage-choice="manageChoice"
        :copy-submitting="copySubmitting"
        :current-branch-label="currentBranchLabel"
        :target-branch-label="targetBranchLabel"
        :activation-branch-options="activationBranchOptions"
        :activation-error="activationError"
        :activation-submitting="activationSubmitting"
        :manage-options="manageOptions"
        :manage-submitting="manageSubmitting"
        @cancel-copy="closeCopyDialog"
        @confirm-copy="confirmCopyQuestions"
        @cancel-activation="closeActivationDialog"
        @confirm-activation="confirmActivation"
        @cancel-manage="closeManageDialog"
        @confirm-manage="confirmManageAction"
      />
    </v-container>
  </div>
</template>

<script src="../features/finalExam/adminFinalExamView.js"></script>

<style src="../styles/views/admin-final-exam-core.css"></style>
<style src="../styles/views/admin-final-exam-editor.css"></style>
<style src="../styles/views/admin-final-exam-responsive.css"></style>
