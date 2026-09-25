<template>
  <div class="assessment-page">
    <v-container class="assessment-page__container py-6 py-md-10">
      <v-card
        class="assessment-shell pa-4 pa-sm-6 pa-md-8"
        elevation="0"
      >
        <div class="assessment-shell__header">
          <div>
            <div class="assessment-shell__eyebrow">
              استبيان الرضا
            </div>
            <h1 class="assessment-shell__title">
              {{ activeCourse ? activeCourse.title : 'استبيان الرضا' }}
            </h1>
          </div>
          <div class="assessment-shell__actions">
            <v-chip
              small
              color="primary"
              text-color="white"
              class="assessment-shell__chip"
            >
              استبيان الرضا
            </v-chip>
            <AppButton
              variant="plain"
              :to="{ name: 'home' }"
            >
              الرئيسية
            </AppButton>
          </div>
        </div>

        <div
          v-if="dashboardLoading && !dashboardSnapshot"
          class="assessment-empty-state"
        >
          جارٍ تحميل البيانات...
        </div>
        <div
          v-else-if="dashboardError"
          class="assessment-alert assessment-alert--error"
        >
          {{ dashboardError }}
        </div>
        <div
          v-else-if="!currentUser"
          class="assessment-alert assessment-alert--error"
        >
          سجّل الدخول أولًا للوصول إلى هذه الصفحة.
        </div>
        <div
          v-else-if="!student"
          class="assessment-alert assessment-alert--error"
        >
          لم يتم العثور على بيانات الطالب المرتبطة بالحساب الحالي.
        </div>
        <div
          v-else-if="!activeCourse"
          class="assessment-empty-state"
        >
          لا توجد دورة مفعلة حاليًا.
        </div>
        <div
          v-else-if="!hasPostSubmission"
          class="assessment-alert assessment-alert--warning"
        >
          أرسل الاختبار البعدي أولًا ثم أكمل استبيان الرضا.
        </div>
        <div
          v-else-if="satisfactionQuestions.length === 0"
          class="assessment-empty-state"
        >
          لا توجد أسئلة رضا مضافة لهذه الدورة.
        </div>
        <div
          v-else-if="alreadySubmittedSatisfaction"
          class="assessment-alert assessment-alert--success"
        >
          شكرًا، تم استلام استبيان الرضا.
        </div>
        <template v-else>
          <div
            v-if="pageError"
            class="assessment-alert assessment-alert--error"
          >
            {{ pageError }}
          </div>

          <div class="assessment-section-title">
            أجب على الأسئلة التالية:
          </div>

          <article
            v-for="(question, index) in satisfactionQuestions"
            :key="question.id"
            class="assessment-question"
          >
            <div class="assessment-question__title">
              {{ index + 1 }}. {{ question.prompt }}
              <span
                v-if="question.isRequired"
                class="assessment-required"
              >*</span>
            </div>

            <div
              v-if="question.type === 'rating'"
              class="assessment-rating-bar"
            >
              <div class="assessment-rating-bar__labels">
                <span>1</span>
                <span class="assessment-rating-bar__value">
                  {{ answers[question.id]?.ratingValue ?? 'غير محدد' }}
                </span>
                <span>10</span>
              </div>
              <v-slider
                :model-value="answers[question.id]?.ratingValue ?? 1"
                min="1"
                max="10"
                step="1"
                ticks="always"
                tick-size="3"
                hide-details
                class="assessment-rating-bar__slider"
                :class="{ 'assessment-rating-bar__slider--unanswered': answers[question.id]?.ratingValue == null }"
                @update:model-value="setRating(question.id, $event)"
              />
            </div>

            <v-textarea
              v-else
              :model-value="answers[question.id]?.textValue || ''"
              outlined
              rows="4"
              hide-details
              class="assessment-textarea"
              placeholder="اكتب رأيك هنا"
              @update:model-value="setText(question.id, $event)"
            />
          </article>

          <div class="assessment-submit-row">
            <AppButton
              variant="primary"
              class="assessment-submit-button"
              :loading="submitting"
              :disabled="submitting"
              @click="handleSubmit"
            >
              إرسال الاستبيان
            </AppButton>
          </div>
        </template>
      </v-card>
    </v-container>
  </div>
</template>

<script src="../features/controllers/SatisfactionView.js"></script>

<style scoped src="../styles/views/satisfaction-view.css"></style>
