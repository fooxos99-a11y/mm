<template>
  <component
    :is="questionId ? 'section' : 'AppCard'"
    class="satisfaction-responses"
    :class="{ 'admin-workspace-card': !questionId, 'satisfaction-responses--question': questionId }"
    :aria-labelledby="`${panelId}-title`"
  >
    <header class="satisfaction-responses__header">
      <h2 :id="`${panelId}-title`">
        {{ questionId ? 'إجابات السؤال' : 'إجابات الاستبيان' }}
      </h2>
      <p>عدد المشاركين: {{ respondents.length }}</p>
    </header>
    <AppFilterToolbar :columns="1">
      <AppFilterField
        :for-id="`${panelId}-search`"
        :label="questionId ? 'البحث بالاسم' : 'البحث بالاسم أو رقم الدخول'"
      >
        <AppTextField
          :id="`${panelId}-search`"
          v-model="query"
          :aria-label="questionId ? 'البحث بالاسم' : 'البحث بالاسم أو رقم الدخول'"
          clearable
          hide-details
          autocomplete="off"
        />
      </AppFilterField>
    </AppFilterToolbar>
    <p
      v-if="!respondents.length"
      class="satisfaction-responses__empty"
      role="status"
    >
      {{ questionId ? 'لم تصل إجابات لهذا السؤال في هذه الدورة بعد.' : 'لم تصل إجابات لهذه الدورة بعد.' }}
    </p>
    <p
      v-else-if="!filteredRespondents.length"
      class="satisfaction-responses__empty"
      role="status"
    >
      {{ questionId ? 'لا توجد أسماء تطابق بحثك.' : 'لا توجد أسماء أو أرقام دخول تطابق بحثك.' }}
    </p>
    <ul
      v-else
      class="satisfaction-responses__list"
      aria-label="المشاركون في الاستبيان"
    >
      <li
        v-for="person in visibleRespondents"
        :key="person.key"
        class="satisfaction-responses__row"
      >
        <div class="satisfaction-responses__identity">
          <h3>{{ person.name }}</h3>
          <p v-if="!questionId && person.loginCode">
            رقم الدخول: <bdi dir="ltr">{{ person.loginCode }}</bdi>
          </p>
          <p v-if="!questionId">
            عدد الإجابات: {{ person.answerCount }}
          </p>
          <p v-if="!questionId">
            آخر إجابة: <time :datetime="person.submittedAt || undefined">{{ formatDate(person.timestamp) }}</time>
          </p>
        </div>
        <AppButton
          v-if="!questionId"
          variant="secondary"
          :aria-label="person.loginCode ? `عرض إجابات ${person.name}، رقم الدخول ${person.loginCode}` : `عرض إجابات ${person.name}`"
          @click="selectedKey = person.key"
        >
          عرض الإجابات
        </AppButton>
        <SatisfactionAnswers
          v-else
          :answers="person.answers"
          :show-prompt="false"
        />
      </li>
    </ul>
    <AppPagination
      v-model="page"
      :page-count="pageCount"
    />
    <AppDialog
      v-if="!questionId"
      v-model="detailsOpen"
      max-width="760"
      scrollable
      aria-label="إجابات الاستبيان"
    >
      <div
        v-if="selectedRespondent"
        class="app-dialog"
      >
        <AppDialogHeader
          title="إجابات الاستبيان"
          :eyebrow="courseTitle"
          closable
          @close="selectedKey = ''"
        >
          <div class="satisfaction-responses__person">
            <strong>{{ selectedRespondent.name }}</strong>
            <p v-if="selectedRespondent.loginCode">
              رقم الدخول: <bdi dir="ltr">{{ selectedRespondent.loginCode }}</bdi>
            </p>
          </div>
        </AppDialogHeader>
        <AppDialogBody
          tabindex="0"
          role="region"
          aria-label="تفاصيل الإجابات"
        >
          <SatisfactionAnswers :answers="selectedRespondent.answers" />
        </AppDialogBody>
        <AppDialogFooter>
          <AppButton
            variant="secondary"
            @click="selectedKey = ''"
          >
            إغلاق
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </component>
</template>

<script>
import {
  AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
  AppFilterField, AppFilterToolbar, AppPagination, AppTextField,
} from '../ui';
import { buildSatisfactionRespondents, filterSatisfactionRespondents } from '../../features/satisfaction/satisfactionResponseModel.mjs';
import SatisfactionAnswers from './SatisfactionAnswers.vue';

const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh',
});

export default {
  name: 'SatisfactionResponses',
  components: {
    AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
    AppFilterField, AppFilterToolbar, AppPagination, AppTextField,
    SatisfactionAnswers,
  },
  props: {
    courseId: { type: String, required: true },
    courseTitle: { type: String, default: '' },
    questionId: { type: String, default: '' },
    responses: { type: Array, default: () => [] },
    questions: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
  },
  data: () => ({ query: '', page: 1, selectedKey: '' }),
  computed: {
    panelId() { return `satisfaction-responses-${this.$.uid}`; },
    respondents() {
      return buildSatisfactionRespondents({
        courseId: this.courseId, questionId: this.questionId, responses: this.responses, questions: this.questions, students: this.students,
      });
    },
    filteredRespondents() { return filterSatisfactionRespondents(this.respondents, this.query); },
    pageCount() { return Math.max(1, Math.ceil(this.filteredRespondents.length / 20)); },
    visibleRespondents() { return this.filteredRespondents.slice((this.page - 1) * 20, this.page * 20); },
    selectedRespondent() { return this.respondents.find(person => person.key === this.selectedKey) || null; },
    detailsOpen: {
      get() { return Boolean(this.selectedRespondent); },
      set(value) { if (!value) this.selectedKey = ''; },
    },
  },
  watch: {
    query() { this.page = 1; },
    courseId() { this.query = ''; this.page = 1; this.selectedKey = ''; },
    questionId() { this.query = ''; this.page = 1; this.selectedKey = ''; },
    pageCount(value) { this.page = Math.min(this.page, value); },
    selectedRespondent(value) { if (!value) this.selectedKey = ''; },
  },
  methods: { formatDate(value) { return value === null ? 'غير مسجّل' : dateFormatter.format(value); } },
};
</script>

<style scoped src="../../styles/components/satisfaction-responses.css"></style>
