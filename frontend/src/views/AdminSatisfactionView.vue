<template>
  <div
    class="satisfaction-admin"
    :class="{ 'satisfaction-admin--embedded': embedded }"
  >
    <v-container class="satisfaction-admin__container py-8 py-md-10">
      <div
        v-if="dashboardError"
        class="satisfaction-admin__alert satisfaction-admin__alert--error"
      >
        {{ dashboardError }}
      </div>

      <section class="satisfaction-admin__card">
        <div class="satisfaction-admin__toolbar">
          <div class="prep-field satisfaction-admin__filter-field">
            <label
              class="prep-field__label"
              for="satisfaction-course"
            >الدورة</label>
            <AppSelect
              id="satisfaction-course"
              v-model="courseSelectValue"
              aria-label="الدورة"
              :items="courseOptions"
              item-text="label"
              item-value="value"
              placeholder="اختر الدورة"
              persistent-placeholder
              hide-details
              dense
              outlined
              class="prep-select satisfaction-admin__select"
            />
          </div>
        </div>

        <div
          v-if="!selectedCourse"
          class="satisfaction-admin__empty"
        >
          {{ hasAvailableCourses ? 'اختر دورة لعرض مؤشرات الاستبيان.' : 'لا توجد دورات تحتوي على اختبار بعدي حاليًا.' }}
        </div>
        <template v-else>
          <section class="satisfaction-admin__metrics">
            <div
              v-if="!questions.length"
              class="satisfaction-admin__empty"
            >
              لا توجد أسئلة رضا مضافة لهذه الدورة بعد.
            </div>
            <div
              v-else
              class="satisfaction-admin__metrics-grid"
            >
              <article
                v-for="indicatorCard in indicatorCards"
                :key="indicatorCard.id"
                class="satisfaction-admin__metric-card assessment-score-indicator"
              >
                <AppIconButton
                  variant="plain"
                  class="satisfaction-admin__delete-indicator"
                  :disabled="deletingQuestionKey === indicatorCard.questionKey"
                  @click="deleteQuestionFromIndicator(indicatorCard)"
                >
                  <v-icon small>
                    mdi-close
                  </v-icon>
                </AppIconButton>
                <div
                  class="assessment-score-indicator__ring"
                  :style="indicatorRingStyle(indicatorCard.progress)"
                >
                  <div class="assessment-score-indicator__ring-core">
                    {{ animatedIndicatorDisplay(indicatorCard.display) }}
                  </div>
                </div>
                <div class="assessment-score-indicator__text">
                  <div class="assessment-score-indicator__subtitle satisfaction-admin__metric-title">
                    {{ indicatorCard.prompt }}
                  </div>
                  <div class="assessment-score-indicator__sublabel">
                    {{ indicatorCard.meta }}
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>
      </section>

      <AppDialog
        v-model="addDialogOpen"
        max-width="640"
        @close="closeAddDialog"
      >
        <v-card class="satisfaction-admin__dialog pa-5">
          <AppDialogHeader
            class="satisfaction-admin__dialog-header"
            title="إضافة استبيان جديد"
          />
          <div class="satisfaction-admin__dialog-note">
            اختر ما إذا كان السؤال سيُضاف لكل الدورات البعدية أو لدورة محددة فقط.
          </div>

          <AppTextField
            v-model.trim="questionDraft.prompt"
            label="نص السؤال"
            dense
            outlined
            class="satisfaction-admin__field"
          />

          <AppSelect
            v-model="questionDraft.type"
            :items="questionTypeOptions"
            item-text="label"
            item-value="value"
            label="نوع السؤال"
            dense
            outlined
            class="satisfaction-admin__field"
          />

          <AppSelect
            v-model="questionTargetScopeValue"
            :items="questionTargetOptions"
            item-text="label"
            item-value="value"
            label="الدورة"
            placeholder="اختر الدورة"
            persistent-placeholder
            dense
            outlined
            class="satisfaction-admin__field"
          />

          <AppSelect
            v-if="questionDraft.targetScope === 'course'"
            v-model="targetCourseSelectValue"
            :items="targetCourseOptions"
            item-text="label"
            item-value="value"
            label="اختر الدورة"
            placeholder="اختر الدورة"
            persistent-placeholder
            dense
            outlined
            class="satisfaction-admin__field"
          />

          <v-switch
            v-model="questionDraft.isRequired"
            color="primary"
            inset
            hide-details
            label="سؤال إلزامي"
            class="satisfaction-admin__switch"
          />

          <AppDialogFooter class="satisfaction-admin__dialog-actions">
            <AppButton
              variant="secondary"
              @click="closeAddDialog"
            >
              إلغاء
            </AppButton>
            <AppButton
              variant="primary"
              :loading="submitting"
              @click="submitQuestion"
            >
              إضافة
            </AppButton>
          </AppDialogFooter>
        </v-card>
      </AppDialog>
    </v-container>
  </div>
</template>

<script src="../features/controllers/AdminSatisfactionView.js"></script>

<style scoped src="../styles/views/admin-satisfaction.css"></style>
