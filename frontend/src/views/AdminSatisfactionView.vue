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

      <AppCard class="satisfaction-admin__card admin-workspace-card">
        <AppFilterToolbar :columns="1">
          <AppFilterField
            for-id="satisfaction-course"
            label="الدورة"
          >
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
          </AppFilterField>
        </AppFilterToolbar>

        <div
          v-if="!selectedCourse"
          class="satisfaction-admin__empty"
        >
          {{ hasAvailableCourses ? 'اختر دورة لعرض مؤشرات الاستبيان.' : 'لا توجد دورات حاليًا.' }}
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
              class="satisfaction-admin__metrics-grid dashboard-indicators-grid app-indicator-grid"
            >
              <AppIndicatorCard
                v-for="indicatorCard in indicatorCards"
                :key="indicatorCard.id"
                class="satisfaction-admin__metric-card"
                :label="indicatorCard.prompt"
                :display="indicatorCard.display"
                :animated-value="animatedIndicatorDisplay(indicatorCard.display)"
                :progress="animatedIndicatorPercent(indicatorCard.progress)"
                :meta="indicatorCard.meta"
                show-meta
              >
                <template #actions>
                  <AppIconButton
                    v-if="canEditQuestions"
                    variant="plain"
                    :label="`حذف سؤال ${indicatorCard.prompt}`"
                    class="satisfaction-admin__delete-indicator"
                    :disabled="deletingQuestionKey === indicatorCard.questionKey"
                    @click="deleteQuestionFromIndicator(indicatorCard)"
                  >
                    <v-icon small>
                      mdi-close
                    </v-icon>
                  </AppIconButton>
                </template>
              </AppIndicatorCard>
            </div>
          </section>
        </template>
      </AppCard>

      <AppDialog
        v-model="addDialogOpen"
        max-width="640"
        @close="closeAddDialog"
      >
        <div class="app-dialog satisfaction-admin__dialog">
          <AppDialogHeader
            class="satisfaction-admin__dialog-header"
            title="إضافة استبيان جديد"
          />
          <AppDialogBody>
            <AppTextField
              v-model.trim="questionDraft.prompt"
              label="نص السؤال"
              dense
              outlined
              hide-details
              class="satisfaction-admin__field"
            />

            <AppSelect
              v-model="questionDraft.type"
              :items="questionTypeOptions"
              item-text="label"
              item-value="value"
              label="نوع السؤال"
              hide-details
              dense
              outlined
              class="satisfaction-admin__field"
            />

            <AppSelect
              v-model="questionTargetValue"
              :items="questionTargetOptions"
              item-text="label"
              item-value="value"
              label="الدورة"
              hide-details
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
          </AppDialogBody>
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
        </div>
      </AppDialog>
    </v-container>
  </div>
</template>

<script src="../features/controllers/AdminSatisfactionView.js"></script>

<style scoped src="../styles/views/admin-satisfaction.css"></style>
