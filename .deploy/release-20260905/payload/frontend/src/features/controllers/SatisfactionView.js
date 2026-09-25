import { mapActions, mapState } from 'vuex';
import { AppButton } from '../../components/ui';

export default {
  name: 'SatisfactionView',
  components: {
    AppButton,
  },
  data() {
    return {
      answers: {},
      pageError: '',
      submitting: false,
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardLoading', 'dashboardError', 'currentUser']),
    student() {
      const students = this.dashboardSnapshot?.students || [];
      const loginCode = this.currentUser?.loginCode || '';

      return students.find((student) => student.loginId === loginCode) || null;
    },
    activeCourse() {
      const courses = (this.dashboardSnapshot?.courses || []).filter((course) => course.entityType !== 'task');

      return courses.find((course) => course.isActive) || null;
    },
    postSubmission() {
      if (!this.activeCourse || !this.student) {
        return null;
      }

      return [...(this.dashboardSnapshot?.submissions || [])]
        .filter((submission) => (
          submission.courseId === this.activeCourse.id
          && submission.assessmentType === 'post'
          && submission.loginId === this.student.loginId
        ))
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0] || null;
    },
    hasPostSubmission() {
      return Boolean(this.postSubmission);
    },
    satisfactionQuestions() {
      if (!this.activeCourse) {
        return [];
      }

      return [...(this.dashboardSnapshot?.satisfactionQuestions || [])]
        .filter((question) => question.courseId === this.activeCourse.id)
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
    alreadySubmittedSatisfaction() {
      if (!this.activeCourse || !this.student || this.satisfactionQuestions.length === 0) {
        return false;
      }

      const responses = this.dashboardSnapshot?.satisfactionResponses || [];

      return this.satisfactionQuestions.every((question) => responses.some((response) => (
        response.courseId === this.activeCourse.id
        && response.questionId === question.id
        && response.loginCode === this.student.loginId
      )));
    },
  },
  created() {
    if (!this.dashboardSnapshot) {
      this.loadDashboardSnapshot();
    }
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot', 'submitSatisfactionResponses']),
    setRating(questionId, value) {
      this.answers[questionId] = {
        ratingValue: value,
        textValue: '',
      };
      this.pageError = '';
    },
    setText(questionId, value) {
      this.answers[questionId] = {
        ratingValue: null,
        textValue: value,
      };
      this.pageError = '';
    },
    validateAnswers() {
      for (const question of this.satisfactionQuestions) {
        if (!question.isRequired) {
          continue;
        }

        if (question.type === 'rating' && this.answers[question.id]?.ratingValue == null) {
          this.pageError = 'أجب على جميع أسئلة الرضا الإلزامية.';
          return false;
        }

        if (question.type === 'text' && !(this.answers[question.id]?.textValue || '').trim()) {
          this.pageError = 'أجب على جميع أسئلة الرضا الإلزامية.';
          return false;
        }
      }

      this.pageError = '';
      return true;
    },
    async handleSubmit() {
      if (!this.activeCourse || !this.student || !this.hasPostSubmission) {
        this.pageError = 'يجب إرسال الاختبار البعدي أولًا.';
        return;
      }

      if (!this.validateAnswers()) {
        return;
      }

      this.submitting = true;

      try {
        await this.submitSatisfactionResponses(this.satisfactionQuestions.map((question) => ({
          courseId: this.activeCourse.id,
          questionId: question.id,
          loginCode: this.student.loginId,
          studentName: this.student.name,
          ratingValue: question.type === 'rating' ? (this.answers[question.id]?.ratingValue ?? null) : null,
          textValue: question.type === 'text' ? (this.answers[question.id]?.textValue || '') : '',
        })));
        this.pageError = '';
        this.answers = {};
      } catch (error) {
        this.pageError = error?.response?.data?.message || error?.message || 'تعذر إرسال الاستبيان.';
      } finally {
        this.submitting = false;
      }
    },
  },
};
