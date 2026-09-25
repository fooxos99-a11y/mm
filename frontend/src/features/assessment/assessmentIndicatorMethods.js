import { createQuestionDraft, validateQuestionDraft } from '../assessmentQuestions/questionModel.mjs';
import { branchLabels } from './adminAssessmentConfig';


export default {
    createQuestionDraft,
    syncQuestionDrafts(questions) {
      const nextDrafts = {};
      const nextErrors = {};

      (questions || []).forEach((question) => {
        nextDrafts[question.id] = this.createQuestionDraft(question);
        nextErrors[question.id] = this.questionDraftErrors[question.id] || '';
      });

      this.questionDrafts = nextDrafts;
      this.questionDraftErrors = nextErrors;
      this.pendingDeletedQuestionIds = this.pendingDeletedQuestionIds.filter((id) => Boolean(nextDrafts[id]));
    },
    updateQuestionDraft(questionId, patch) {
      this.questionDrafts = {
        ...this.questionDrafts,
        [questionId]: {
          ...(this.questionDrafts[questionId] || this.createQuestionDraft()),
          ...patch,
        },
      };
    },
    clearQuestionDraftError(questionId) {
      this.questionDraftErrors = {
        ...this.questionDraftErrors,
        [questionId]: '',
      };
    },
    validateQuestionDraft,
    buildIndicatorRingStyle(percent) {
      const safePercent = this.animatedIndicatorPercent(percent);

      return {
        background: `conic-gradient(#156c82 0 ${safePercent}%, #e9f2f5 ${safePercent}% 100%)`,
      };
    },
    buildAssessmentScoreIndicator(type) {
      if (!this.assessmentIndicatorsCourse || !this.assessmentIndicatorsTotalStudents) {
        return {
          count: 0,
          submitted: 0,
          totalStudents: this.assessmentIndicatorsTotalStudents,
          totalPoints: 0,
          averageScore: 0,
          percent: 0,
        };
      }

      const questions = type === 'pre'
        ? (this.assessmentIndicatorsCourse.preQuestions || [])
        : (this.assessmentIndicatorsCourse.postQuestions || []);
      const totalPoints = questions.reduce((sum, question) => sum + (Number(question.points || 0) || 0), 0);

      const scores = this.assessmentIndicatorStudents.reduce((items, student) => {
        const submission = this.findAssessmentSubmission(student.loginId, type);

        if (!submission) {
          return items;
        }

        items.push(this.resolveAssessmentSubmissionScore(submission, questions));
        return items;
      }, []);
      const submitted = scores.length;
      const averageScore = submitted
        ? scores.reduce((sum, score) => sum + score, 0) / submitted
        : 0;

      const percent = totalPoints > 0
        ? Math.round((averageScore / totalPoints) * 100)
        : 0;

      return {
        count: submitted,
        submitted,
        totalStudents: this.assessmentIndicatorsTotalStudents,
        totalPoints,
        averageScore,
        percent,
      };
    },
    formatScoreValue(value) {
      const safeValue = Number(value) || 0;

      if (Number.isInteger(safeValue)) {
        return String(safeValue);
      }

      return safeValue.toFixed(1);
    },
    formatIndicatorMetaLabel(indicator) {
      return `${Number(indicator?.submitted || 0)} معلم`;
    },
    findAssessmentSubmission(loginId, type) {
      if (!loginId || !this.assessmentIndicatorsCourse) {
        return null;
      }

      const matches = this.submissions.filter((item) => (
        item.courseId === this.assessmentIndicatorsCourse.id
        && item.assessmentType === type
        && item.loginId === loginId
      ));

      return matches[matches.length - 1] || null;
    },
    resolveAssessmentSubmissionScore(submission, questions) {
      if (!submission) {
        return 0;
      }

      if (submission.manualScore !== null && submission.manualScore !== undefined) {
        return Number(submission.manualScore) || 0;
      }

      if (!questions.length) {
        return 0;
      }

      const answerMap = new Map((submission.answers || []).map((answer) => [answer.questionId, answer]));

      return questions.reduce((sum, question) => {
        if (!question.correctAnswer) {
          return sum;
        }

        const answer = answerMap.get(question.id);
        const studentAnswer = String(answer?.value || '').trim();

        if (this.normalizeAnswer(studentAnswer) === this.normalizeAnswer(question.correctAnswer)) {
          return sum + Number(question.points || 0);
        }

        return sum;
      }, 0);
    },
    branchLabel(branchId) {
      return branchLabels[branchId] || '';
    },
    assessmentEnabledKey(type) {
      return {
        pre: 'isPreEnabled',
        post: 'isPostEnabled',
        tasks: 'isTasksEnabled',
      }[type] || 'isPreEnabled';
    },
    getWindowMeta(value) {
      if (!value) {
        return { opensAt: '', closesAt: '', durationMinutes: 0 };
      }

      if (typeof value === 'string') {
        return { opensAt: '', closesAt: value, durationMinutes: 0 };
      }

      return {
        opensAt: value.opensAt || '',
        closesAt: value.closesAt || '',
        durationMinutes: Number(value.durationMinutes) || 0,
      };
    },
    isWindowActive(windowValue) {
      const windowMeta = this.getWindowMeta(windowValue);

      if (!windowMeta.closesAt) {
        return false;
      }

      const closesAt = new Date(windowMeta.closesAt).getTime();

      if (!Number.isFinite(closesAt) || closesAt <= this.currentTimestamp) {
        return false;
      }

      if (!windowMeta.opensAt) {
        return true;
      }

      const opensAt = new Date(windowMeta.opensAt).getTime();
      return !Number.isFinite(opensAt) || opensAt <= this.currentTimestamp;
    },
    isAssessmentBranchActive(course, type, branchId) {
      if (!course || !branchId) {
        return false;
      }

      const enabled = Boolean(course[this.assessmentEnabledKey(type)]);
      const branchEnabled = course.branchAvailability?.[branchId]?.[type] !== false;
      const branchWindow = course.assessmentWindows?.[branchId]?.[type];

      return enabled && branchEnabled && this.isWindowActive(branchWindow);
    },
    isAssessmentActive(course, type) {
      return this.isAssessmentBranchActive(course, type, 'male') || this.isAssessmentBranchActive(course, type, 'female');
    },
    assessmentAvailabilityButtonLabel(course, type) {
      const label = this.assessmentLabels[type] || 'الاختبار';
      const maleActive = this.isAssessmentBranchActive(course, type, 'male');
      const femaleActive = this.isAssessmentBranchActive(course, type, 'female');

      if (!maleActive && !femaleActive) {
        return label;
      }

      if (maleActive && femaleActive) {
        const globalWindow = this.getWindowMeta(course?.assessmentWindows?.global?.[type]);
        const closesAt = globalWindow.closesAt || this.getWindowMeta(course?.assessmentWindows?.male?.[type]).closesAt;
        return `الكل ${this.formatCountdownFromDate(closesAt)}`;
      }

      const activeBranch = maleActive ? 'male' : 'female';
      const closesAt = this.getWindowMeta(course?.assessmentWindows?.[activeBranch]?.[type]).closesAt;
      return `${this.branchLabel(activeBranch)} ${this.formatCountdownFromDate(closesAt)}`;
    },
    formatCountdownFromDate(value) {
      const parsed = new Date(value).getTime();

      if (!Number.isFinite(parsed) || parsed <= this.currentTimestamp) {
        return '00:00';
      }

      const totalSeconds = Math.max(0, Math.floor((parsed - this.currentTimestamp) / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    handleAssessmentAvailabilityAction(course, type) {
      const resolvedType = this.resolveActionAssessmentType(type);

      if (!this.isAssessmentActive(course, resolvedType)) {
        this.openAssessmentAvailabilityDialog(course.id, resolvedType, 'all', false);
        return;
      }

      this.openAssessmentManageDialog(course.id, resolvedType);
    },
    handleCurrentAssessmentAvailabilityAction() {
      if (!this.selectedCourse || !this.currentAssessmentActionType) {
        return;
      }

      this.handleAssessmentAvailabilityAction(this.selectedCourse, this.currentAssessmentActionType);
    },
};
