<template>
  <div
    class="results-view"
    :class="{ 'results-view--embedded': embedded }"
  >
    <output
      v-if="isSnapshotTruncated"
      class="results-snapshot-warning d-block"
    >
      بيانات النتائج غير مكتملة. أعد تحميل الصفحة قبل الاعتماد على المجاميع.
    </output>

    <ResultsAttendancePanel
      v-if="isAttendanceMode"
      :embedded="embedded"
      :save-status-text="saveStatusText"
      :is-saving="isSavingAttendance"
      :managed-branch-id="managedBranchId"
      :branch-id="attendanceBranchId"
      :branch-options="branchOptions"
      :course-id="attendanceCourseId"
      :course-options="courseOptions"
      :can-manage-courses="canManageCourses"
      :deleting-course-id="deletingCourseId"
      :all-visible-checked="allVisibleChecked"
      :visible-checked-count="visibleCheckedCount"
      :students="attendanceStudents"
      :displayed-students="displayedAttendanceStudents"
      :checked-student-ids="attendanceChecked"
      @update:branch-id="attendanceBranchId = $event"
      @update:course-id="attendanceCourseId = $event"
      @request-course-delete="requestCourseDelete"
      @toggle-visible="toggleVisibleAttendance"
      @toggle-student="toggleAttendance"
    />

    <section
      v-else
      class="results-board"
    >
      <AppCard class="results-shell admin-workspace-card">
        <div class="results-shell__header">
          <h1 class="results-shell__title">
            لوحة النتائج
          </h1>
          <AppButton
            v-if="canEnterGrades"
            :disabled="resultsLoading"
            @click="openGradeDialog"
          >
            إدخال الدرجات
          </AppButton>
        </div>

        <AppFilterToolbar :columns="1 + Number(!managedBranchId) + Number(isCourseResultsSection) + Number(showStudentFilter)">
          <AppFilterField
            for-id="results-filter-course"
            label="القسم"
          >
            <AppSelect
              id="results-filter-course"
              v-model="resultsCourseId"
              aria-label="القسم"
              :items="resultsCourseOptions"
              item-text="label"
              item-value="value"
              placeholder="اختر"
              persistent-placeholder
              dense
              outlined
              hide-details
              class="results-select"
            />
          </AppFilterField>

          <AppFilterField
            v-if="!managedBranchId"
            for-id="results-filter-branch"
            label="الفرع"
          >
            <AppSelect
              id="results-filter-branch"
              v-model="resultsBranchId"
              aria-label="الفرع"
              :items="branchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="results-select"
            />
          </AppFilterField>

          <AppFilterField
            v-if="isCourseResultsSection"
            for-id="results-filter-type"
            label="نوع البيانات"
          >
            <AppSelect
              id="results-filter-type"
              v-model="resultsType"
              aria-label="نوع البيانات"
              :items="resultsTypeOptions"
              item-text="label"
              item-value="value"
              placeholder="اختر"
              persistent-placeholder
              dense
              outlined
              hide-details
              class="results-select"
            />
          </AppFilterField>

          <AppFilterField
            v-if="showStudentFilter"
            for-id="results-filter-student"
            :label="studentFilterLabel"
          >
            <AppSelect
              id="results-filter-student"
              v-model="studentFilter"
              :aria-label="studentFilterLabel"
              :items="studentFilterOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="results-select"
            />
          </AppFilterField>
        </AppFilterToolbar>
      </AppCard>

      <AppCard class="results-list-shell admin-workspace-card">
        <input
          :value="resultsSearch"
          type="search"
          maxlength="100"
          aria-label="البحث في النتائج بالاسم أو رقم الدخول"
          placeholder="ابحث بالاسم أو رقم الدخول"
          class="results-search"
          @input="searchResults($event.target.value)"
        >
        <div
          v-if="isAttendanceResultsType && hasSelectedResultsSection && !resultsLoading && !resultsError && resultSnapshot"
          class="results-attendance-summary"
        >
          <span>عدد الحضور: {{ attendancePresentCount }}</span>
          <span>عدد الغياب: {{ attendanceAbsentCount }}</span>
        </div>

        <div
          v-if="resultsError"
          class="results-empty-state"
          role="alert"
        >
          {{ resultsError }}
          <AppRawButton
            class="results-retry"
            @click="retryResults"
          >
            إعادة المحاولة
          </AppRawButton>
        </div>
        <div
          v-else-if="resultsLoading"
          class="results-empty-state"
        >
          جارٍ تحميل البيانات...
        </div>
        <div
          v-else-if="!hasSelectedResultsSection"
          class="results-empty-state"
        >
          {{ isCourseResultsSection && !resultsType ? 'اختر نوع البيانات لعرض النتائج.' : 'لا توجد عناصر متاحة لهذا النوع من البيانات.' }}
        </div>
        <div
          v-else-if="displayedRows.length === 0"
          class="results-empty-state"
        >
          لا توجد بيانات مطابقة للفلاتر الحالية.
        </div>
        <div
          v-else
          class="results-list"
        >
          <article
            v-for="row in displayedRows"
            :key="row.key"
            class="results-entry"
          >
            <div class="results-entry__actions">
              <template v-if="isAttendanceResultsType">
                <span
                  class="results-entry__status-pill"
                  :class="row.present ? 'results-entry__status-pill--present' : 'results-entry__status-pill--absent'"
                >
                  {{ row.present ? 'حاضر' : 'غائب' }}
                </span>
              </template>

              <template v-else>
                <AppRawButton
                  v-if="row.attachment"
                  type="button"
                  class="results-entry__attachment"
                  :title="row.attachment.fileName"
                  @click="openAttachmentPreview(row.attachment)"
                >
                  <v-icon small>
                    mdi-paperclip
                  </v-icon>
                </AppRawButton>
                <AppRawButton
                  type="button"
                  class="results-entry__preview"
                  :disabled="!row.submission"
                  @click="openResultDialog(row)"
                >
                  <v-icon small>
                    mdi-eye-outline
                  </v-icon>
                </AppRawButton>
                <span
                  class="results-entry__score-pill"
                  :class="{ 'results-entry__score-pill--empty': !row.submission }"
                >
                  {{ row.scoreLabel }}
                </span>
              </template>
            </div>

            <div class="results-entry__identity">
              <div class="results-entry__name">
                {{ row.name }}
              </div>
              <div class="results-entry__login">
                {{ row.loginId || '---' }}
              </div>
              <div
                v-if="row.attachment"
                class="results-entry__attachment-name"
              >
                {{ row.attachment.fileName }}
              </div>
            </div>
          </article>
        </div>
        <div
          v-if="resultSnapshot && !resultsLoading && !resultsError"
          class="results-pagination"
        >
          <output>عدد النتائج: {{ resultSnapshot.pagination.total }}</output>
          <AppPagination
            :value="resultsPage"
            :page-count="resultSnapshot.pagination.pages"
            @change="loadResultsPage"
          />
        </div>
      </AppCard>

      <ResultsGradeDialog
        :open="gradeDialogOpen"
        :course-title="gradeScope.courseTitle"
        :type-label="gradeScope.typeLabel"
        :rows="gradeRows"
        :total="gradeTotal"
        :total-locked="gradeTotalLocked"
        :search="gradeSearch"
        :loading="gradeLoading"
        :saving="gradeSaving"
        :errors="gradeErrors"
        :error="gradeError"
        :conflict="gradeConflict"
        :load-failed="gradeLoadFailed"
        :changed-count="gradeChangedCount"
        @update:total="gradeTotal = $event"
        @update:search="gradeSearch = $event"
        @update-grade="updateGradeDraft"
        @clear-grade="toggleGradeClear"
        @reload="loadGradeRoster(true)"
        @close="closeGradeDialog"
        @save="saveGradeDrafts"
      />
      <ResultsDialogs
        :result-open="resultDialogOpen"
        :delete-open="courseDeleteDialogOpen"
        :task-section="isTaskResultsSection"
        :final-exam-section="isFinalExamResultsSection"
        :selected-row="selectedResultRow"
        :detail-cards="resultDetailCards"
        :section-label="selectedResultsSectionLabel"
        :result-type-label="activeResultsTypeLabel"
        :total-points="selectedResultsTotalPoints"
        :score-value="scoreEditValue"
        :answer-score-values="answerScoreValues"
        :saving-answer-id="savingAnswerId"
        :has-manual-review-answers="hasManualReviewAnswers"
        :saving="isSavingScore"
        :delete-entity-label="courseDeleteEntityLabel"
        :delete-title="courseDeleteTitle"
        :deleting="isDeletingCourse"
        @update:result-open="resultDialogOpen = $event"
        @update:delete-open="courseDeleteDialogOpen = $event"
        @update:score-value="scoreEditValue = $event"
        @update-answer-score="updateAnswerScoreDraft"
        @save-answer-score="handleSaveAnswerScore"
        @close-result="closeResultDialog"
        @save-score="handleSaveScore"
        @review-task="handleTaskReview"
        @download="downloadResultAsPdf"
        @preview-attachment="openAttachmentPreview"
        @close-delete="closeCourseDeleteDialog"
        @confirm-delete="confirmCourseDelete"
      />
    </section>
  </div>
</template>

<script src="../features/results/adminResultsView.js"></script>

<style src="../styles/views/admin-results-core.css"></style>
<style src="../styles/views/admin-results-details.css"></style>
<style src="../styles/views/admin-results-responsive.css"></style>
<style scoped>
.results-search { width: 100%; min-height: 44px; border: 1px solid #bdced1; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
.results-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.results-retry { min-height: 44px; padding: 8px 16px; }
.results-shell__header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
</style>
