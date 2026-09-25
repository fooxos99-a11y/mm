<template>
  <div class="student-page dashboard-page-shell">
    <StudentNavigation
      :open="mobileMenuOpen"
      :items="studentMenu"
      :active-section="activeSection"
      @select="selectSection"
      @close="mobileMenuOpen = false"
    />

    <main class="dashboard-main">
      <StudentTopbar
        :menu-open="mobileMenuOpen"
        :student-name="studentAccount?.name || ''"
        @toggle-menu="mobileMenuOpen = !mobileMenuOpen"
      />

      <div
        v-if="!hasStudentAccess"
        class="dashboard-error"
      >
        هذه الصفحة مخصصة لحسابات الطلاب فقط.
      </div>

      <section
        v-else-if="loading"
        class="dashboard-loader-shell"
      >
        <div class="dashboard-loader-shell__inner">
          <div
            class="loader"
            aria-hidden="true"
          />
        </div>
      </section>

      <div
        v-else-if="loadError"
        class="dashboard-error"
      >
        {{ loadError }}
      </div>

      <div
        v-else-if="!studentAccount"
        class="dashboard-error dashboard-error--neutral"
      >
        لا توجد بيانات مرتبطة بهذا الطالب حاليًا.
      </div>

      <template v-else>
        <StudentOverviewHeader
          :active-section="activeSection"
          :course-id="selectedCourseId"
          :task-id="selectedTaskId"
          :course-options="courseOptions"
          :task-options="taskOptions"
          :title="activeSectionTitle"
          :description="activeSectionDescription"
          :login="currentStudentLogin"
          :branch-label="currentBranchLabel"
          :reciter-name="assignedReciter?.name || ''"
          :completed-count="completedCount"
          :parts-limit="partsLimit"
          @update:course-id="selectedCourseId = $event"
          @update:task-id="selectedTaskId = $event"
        />

        <section
          v-if="activeSection === 'courses'"
          class="dashboard-section"
        >
          <div class="results-board">
            <div
              v-if="!selectedCourse"
              class="results-list-shell"
            >
              <div class="results-empty-state">
                لا توجد دورات متاحة لعرض النتائج.
              </div>
            </div>

            <template v-else>
              <section class="student-course-section">
                <section class="results-list-shell">
                  <div class="results-list">
                    <article class="results-entry">
                      <div class="results-entry__actions">
                        <span
                          class="results-entry__status-pill"
                          :class="courseAttendancePresent ? 'results-entry__status-pill--present' : 'results-entry__status-pill--absent'"
                        >
                          {{ courseAttendancePresent ? 'حاضر' : 'غائب' }}
                        </span>
                      </div>

                      <div class="results-entry__identity">
                        <div class="results-entry__name">
                          التحضير
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              </section>

              <StudentResultEntry
                section-class="student-course-section"
                title="الاختبار القبلي"
                :submission="preCourseSubmission"
                :score-label="preCourseScoreLabel"
                :details="preCourseDetailCards"
                :expanded="expandedSection === 'course-pre'"
                @toggle="toggleExpandedSection('course-pre')"
              />

              <StudentResultEntry
                section-class="student-course-section"
                title="الاختبار البعدي"
                :submission="postCourseSubmission"
                :score-label="postCourseScoreLabel"
                :details="postCourseDetailCards"
                :expanded="expandedSection === 'course-post'"
                @toggle="toggleExpandedSection('course-post')"
              />
            </template>
          </div>
        </section>

        <section
          v-else-if="activeSection === 'parts'"
          class="dashboard-section"
        >
          <div class="dashboard-card student-parts-card student-parts-card--minimal">
            <div class="student-parts-grid">
              <div
                v-for="part in allParts"
                :key="part"
                class="student-part-circle"
                :class="{ 'student-part-circle--active': completedParts.includes(part) }"
              >
                {{ part }}
              </div>
            </div>
          </div>
        </section>

        <section
          v-else-if="activeSection === 'tasks'"
          class="dashboard-section"
        >
          <div class="results-board">
            <section
              v-if="!selectedTask"
              class="results-list-shell"
            >
              <div class="results-empty-state">
                لا توجد مهام أدائية متاحة.
              </div>
            </section>

            <StudentResultEntry
              v-else
              title="المهمة الأدائية"
              :submission="selectedTaskSubmission"
              :score-label="taskScoreLabel"
              :details="taskDetailCards"
              :expanded="expandedSection === 'task'"
              @toggle="toggleExpandedSection('task')"
            />
          </div>
        </section>

        <section
          v-else-if="activeSection === 'materials'"
          class="dashboard-section"
        >
          <TrainingMaterialsList
            :materials="trainingMaterials"
            preview-in-dialog
            empty-title="لا توجد حقائب تدريبية متاحة حاليًا."
            empty-description="ستظهر الملفات التدريبية هنا بمجرد إضافتها من لوحة الإدارة."
          />
        </section>

        <section
          v-else-if="activeSection === 'indicators'"
          class="dashboard-section"
        >
          <div class="dashboard-card student-indicators-card">
            <CompletionRequirementsPanel
              :student="indicatorStudent"
              :show-login-code="false"
              empty-message="لا توجد مؤشرات مرتبطة بحسابك حاليًا."
            />
          </div>
        </section>

        <section
          v-else
          class="dashboard-section"
        >
          <div class="results-board">
            <section
              v-if="finalExamQuestions.length === 0"
              class="results-list-shell"
            >
              <div class="results-empty-state">
                لا توجد أسئلة نهائية متاحة لهذا الفرع.
              </div>
            </section>

            <StudentResultEntry
              v-else
              title="الاختبار النهائي"
              :submission="finalExamSubmission"
              :score-label="finalExamScoreLabel"
              :details="finalExamDetailCards"
              :expanded="expandedSection === 'final'"
              @toggle="toggleExpandedSection('final')"
            />
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script src="../features/student/studentView.js"></script>

<style src="../styles/views/student-view-core.css"></style>
<style src="../styles/views/student-view-results.css"></style>
