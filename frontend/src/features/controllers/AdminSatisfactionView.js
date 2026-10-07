import { mapActions, mapState } from 'vuex';
import {
  AppButton, AppDialog, AppDialogFooter, AppDialogHeader, AppIconButton, AppSelect, AppTextField,
} from '../../components/ui';
import { useIndicatorAnimation } from '../../composables/useIndicatorAnimation';

const buildIndicatorValue = (isRating, average, textCount) => {
  if (!isRating) {
    return { progress: textCount > 0 ? 100 : 0, display: String(textCount) };
  }

  if (average === null) {
    return { progress: 0, display: '--' };
  }

  return { progress: average * 10, display: average.toFixed(1) };
};

export default {
  name: 'AdminSatisfactionView',
  components: {
    AppDialog,
    AppButton,
    AppSelect,
    AppDialogHeader,
    AppDialogFooter,
    AppIconButton,
    AppTextField,
  },
  setup() {
    return useIndicatorAnimation();
  },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedCourseId: '',
      addDialogOpen: false,
      submitting: false,
      deletingQuestionKey: '',
      questionDraft: {
        prompt: '',
        type: 'rating',
        targetScope: '',
        targetCourseId: '',
        isRequired: true,
      },
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardError']),
    availableCourseOptions() {
      return [...((this.dashboardSnapshot?.courses || []).filter((course) => course.entityType !== 'task'))]
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
        .map((course) => ({
          label: course.title,
          value: course.id,
        }));
    },
    courseOptions() {
      return this.availableCourseOptions;
    },
    courseSelectValue: {
      get() {
        return this.selectedCourseId || null;
      },
      set(value) {
        this.selectedCourseId = value || '';
      },
    },
    hasAvailableCourses() {
      return this.availableCourseOptions.length > 0;
    },
    selectedCourse() {
      return (this.dashboardSnapshot?.courses || []).find((course) => course.id === this.selectedCourseId) || null;
    },
    questions() {
      if (!this.selectedCourse) {
        return [];
      }

      return [...(this.dashboardSnapshot?.satisfactionQuestions || [])]
        .filter((question) => question.courseId === this.selectedCourse.id)
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
    questionOptions() {
      const seen = new Set();

      return (this.dashboardSnapshot?.satisfactionQuestions || [])
        .filter((question) => {
          const key = this.getQuestionKey(question);

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .map((question) => ({
          label: `${question.prompt} - ${question.type === 'rating' ? 'تقييم' : 'نصي'}`,
          value: this.getQuestionKey(question),
        }));
    },
    responses() {
      if (!this.selectedCourse) {
        return [];
      }

      return (this.dashboardSnapshot?.satisfactionResponses || []).filter((response) => response.courseId === this.selectedCourse.id);
    },
    indicatorCards() {
      return this.questions
        .map((question) => {
          const questionResponses = this.responses.filter((response) => response.questionId === question.id);
          const values = questionResponses
            .filter((response) => response.ratingValue !== null && response.ratingValue !== undefined)
            .map((response) => Number(response.ratingValue))
            .filter((value) => Number.isFinite(value));
          const textCount = questionResponses.filter((response) => String(response.textValue || '').trim()).length;
          const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
          const isRating = question.type === 'rating';

          return {
            id: question.id,
            questionKey: this.getQuestionKey(question),
            prompt: question.prompt,
            meta: `${isRating ? values.length : textCount} طالب`,
            ...buildIndicatorValue(isRating, average, textCount),
          };
        });
    },
    indicatorAnimationSignature() {
      return this.indicatorCards
        .map((indicator) => `${indicator.id}:${indicator.progress}:${indicator.display}`)
        .join('|');
    },
    questionTypeOptions() {
      return [
        { label: 'تقييم من 1 إلى 10', value: 'rating' },
        { label: 'إجابة نصية', value: 'text' },
      ];
    },
    questionTargetOptions() {
      return [
        { label: 'جميع الدورات', value: 'all' },
        { label: 'دورة محددة', value: 'course' },
      ];
    },
    questionTargetScopeValue: {
      get() {
        return this.questionDraft.targetScope || null;
      },
      set(value) {
        this.questionDraft.targetScope = value || '';
      },
    },
    targetCourseOptions() {
      return this.availableCourseOptions;
    },
    targetCourseSelectValue: {
      get() {
        return this.questionDraft.targetCourseId || null;
      },
      set(value) {
        this.questionDraft.targetCourseId = value || '';
      },
    },
  },
  watch: {
    dashboardSnapshot: {
      immediate: true,
      handler() {
        this.ensureSelection();
      },
    },
    indicatorAnimationSignature: {
      immediate: true,
      handler() {
        this.$nextTick(() => {
          this.restartIndicatorAnimation();
        });
      },
    },
  },
  created() {
    this.ensureSelection();
  },
  methods: {
    ...mapActions(['addSatisfactionQuestion', 'deleteSatisfactionQuestion']),
    indicatorRingStyle(progress) {
      const normalized = this.animatedIndicatorPercent(progress);
      return {
        background: `conic-gradient(#156c82 0 ${normalized}%, #e9f2f5 ${normalized}% 100%)`,
      };
    },
    getQuestionKey(question) {
      return `${question.prompt}::${question.type}`;
    },
    ensureSelection() {
      if (this.selectedCourseId && this.availableCourseOptions.some((course) => course.value === this.selectedCourseId)) {
        return;
      }

      this.selectedCourseId = '';
    },
    openAddDialog() {
      this.questionDraft = {
        prompt: '',
        type: 'rating',
        targetScope: '',
        targetCourseId: this.selectedCourseId || '',
        isRequired: true,
      };
      this.addDialogOpen = true;
    },
    closeAddDialog() {
      this.addDialogOpen = false;
      this.submitting = false;
    },
    async submitQuestion() {
      if (!this.questionDraft.prompt) {
        this.$toast.error('أدخل نص السؤال أولًا');
        return;
      }

      if (!this.questionDraft.targetScope) {
        this.$toast.error('اختر نطاق إضافة السؤال أولًا');
        return;
      }

      if (this.questionDraft.targetScope === 'course' && !this.questionDraft.targetCourseId) {
        this.$toast.error('اختر الدورة التي تريد إضافة السؤال لها');
        return;
      }

      this.submitting = true;

      try {
        await this.addSatisfactionQuestion({
          prompt: this.questionDraft.prompt,
          type: this.questionDraft.type,
          targetScope: this.questionDraft.targetScope,
          courseId: this.questionDraft.targetScope === 'course' ? this.questionDraft.targetCourseId : null,
          isRequired: this.questionDraft.isRequired,
        });

        if (this.questionDraft.targetScope === 'course' && this.questionDraft.targetCourseId) {
          this.selectedCourseId = this.questionDraft.targetCourseId;
        }

        this.$toast.success('تمت إضافة سؤال الاستبيان');
        this.closeAddDialog();
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر إضافة سؤال الاستبيان');
      } finally {
        this.submitting = false;
      }
    },
    async deleteQuestionFromIndicator(indicator) {
      if (!indicator?.id) {
        this.$toast.error('اختر سؤالًا صالحًا للحذف');
        return;
      }

      this.deletingQuestionKey = indicator.questionKey;

      try {
        await this.deleteSatisfactionQuestion(indicator.id);
        this.$toast.success('تم حذف سؤال الاستبيان');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حذف سؤال الاستبيان');
      } finally {
        this.deletingQuestionKey = '';
      }
    },
  },
};
