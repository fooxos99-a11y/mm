<template>
  <AppCard
    class="satisfaction-responses admin-workspace-card"
    :aria-labelledby="`${panelId}-title`"
  >
    <header class="satisfaction-responses__header">
      <h2 :id="`${panelId}-title`">
        إجابات الاستبيان
      </h2>
      <p>عدد المشاركين: {{ respondents.length }}</p>
    </header>
    <AppFilterToolbar :columns="1">
      <AppFilterField
        :for-id="`${panelId}-search`"
        label="البحث بالاسم أو رقم الدخول"
      >
        <AppTextField
          :id="`${panelId}-search`"
          v-model="query"
          aria-label="البحث بالاسم أو رقم الدخول"
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
      لم تصل إجابات لهذه الدورة بعد.
    </p>
    <p
      v-else-if="!filteredRespondents.length"
      class="satisfaction-responses__empty"
      role="status"
    >
      لا توجد أسماء أو أرقام دخول تطابق بحثك.
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
          <p v-if="person.loginCode">
            رقم الدخول: <bdi dir="ltr">{{ person.loginCode }}</bdi>
          </p>
          <p>عدد الإجابات: {{ person.answerCount }}</p>
          <p>آخر إجابة: <time :datetime="person.submittedAt || undefined">{{ formatDate(person.timestamp) }}</time></p>
        </div>
        <AppButton
          variant="secondary"
          :aria-label="person.loginCode ? `عرض إجابات ${person.name}، رقم الدخول ${person.loginCode}` : `عرض إجابات ${person.name}`"
          @click="selectedKey = person.key"
        >
          عرض الإجابات
        </AppButton>
      </li>
    </ul>
    <AppPagination
      v-model="page"
      :page-count="pageCount"
    />
    <AppDialog
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
        <AppDialogBody>
          <dl class="satisfaction-responses__answers">
            <div
              v-for="answer in selectedRespondent.answers"
              :key="answer.key"
              class="satisfaction-responses__answer"
            >
              <dt>{{ answer.prompt }}</dt>
              <dd>
                <p
                  v-if="answer.ratingValue !== null"
                  class="satisfaction-responses__rating"
                >
                  التقييم: <bdi dir="ltr">{{ answer.ratingValue }} / 10</bdi>
                </p>
                <p
                  v-if="answer.textValue.trim()"
                  class="satisfaction-responses__text"
                >
                  {{ answer.textValue }}
                </p>
                <p
                  v-if="!answer.answered"
                  class="satisfaction-responses__muted"
                >
                  لا توجد إجابة لهذا السؤال.
                </p>
              </dd>
            </div>
          </dl>
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
  </AppCard>
</template>

<script>
import {
  AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
  AppFilterField, AppFilterToolbar, AppPagination, AppTextField,
} from '../ui';
import { buildSatisfactionRespondents, filterSatisfactionRespondents } from '../../features/satisfaction/satisfactionResponseModel.mjs';

const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh',
});

export default {
  name: 'SatisfactionResponses',
  components: {
    AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
    AppFilterField, AppFilterToolbar, AppPagination, AppTextField,
  },
  props: {
    courseId: { type: String, required: true },
    courseTitle: { type: String, default: '' },
    responses: { type: Array, default: () => [] },
    questions: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
  },
  data: () => ({ query: '', page: 1, selectedKey: '' }),
  computed: {
    panelId() { return `satisfaction-responses-${this.$.uid}`; },
    respondents() {
      return buildSatisfactionRespondents({
        courseId: this.courseId, responses: this.responses, questions: this.questions, students: this.students,
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
    pageCount(value) { this.page = Math.min(this.page, value); },
    selectedRespondent(value) { if (!value) this.selectedKey = ''; },
  },
  methods: { formatDate(value) { return value === null ? 'غير مسجّل' : dateFormatter.format(value); } },
};
</script>

<style scoped src="../../styles/components/satisfaction-responses.css"></style>
