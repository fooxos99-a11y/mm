import {
  createQuestionDraft as createQuestionDraftModel, normalizeAssessmentAnswer,
} from '../assessmentQuestions/questionModel.mjs';

export const finalExamBranchMethods = {
    openBranchWorkspace(branchCode) {
      this.selectedBranch = branchCode;
    },
    async toggleBranchActivation(branchCode) {
      if (this.isBranchActive(branchCode)) {
        try {
          await this.closeBranches([branchCode]);
          this.$toast.success('تم تحديث حالة الاختبار النهائي');
        } catch (error) {
          this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة الاختبار النهائي');
        }

        return;
      }

      this.activationBranch = branchCode;
      this.activationPreserveOtherBranch = false;
      this.activationError = '';
      this.activationSubmitting = false;
      this.activationDialogOpen = true;
    },
    branchLabel(branchCode) {
      return this.branchOptions.find((branch) => branch.value === branchCode)?.label || 'هذا الفرع';
    },
    minutesUntil(value) {
      const parsed = new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        return 0;
      }

      const diffMs = parsed.getTime() - Date.now();

      if (diffMs <= 0) {
        return 0;
      }

      return Math.max(1, Math.ceil(diffMs / 60000));
    },
    isBranchActive(branchCode) {
      const setting = this.settings[branchCode] || { isEnabled: false, closesAt: null };

      if (!setting.isEnabled || !setting.closesAt) {
        return false;
      }

      const closesAt = new Date(setting.closesAt).getTime();
      return Number.isFinite(closesAt) && closesAt > this.currentTimestamp;
    },
    questionTypeLabel(type) {
      return this.questionTypeOptions.find((option) => option.value === type)?.label || type;
    },
    normalizeAnswer(value) {
      return normalizeAssessmentAnswer(value);
    },
    normalizeQuestionType(question) {
      if (question?.type === 'text') {
        return 'text';
      }

      return 'multiple';
    },
    createQuestionDraft(question = null) {
      return {
        ...createQuestionDraftModel(question),
        allowFile: 'no',
        correctAnswerTouched: Boolean(question?.correctAnswer),
      };
    },
    syncQuestionDrafts(questions) {
      const nextDrafts = {};
      const nextErrors = {};

      questions.forEach((question) => {
        nextDrafts[question.id] = this.questionDrafts[question.id]
          ? {
            ...this.questionDrafts[question.id],
            type: this.questionDrafts[question.id].type || this.normalizeQuestionType(question),
          }
          : this.createQuestionDraft(question);
        nextErrors[question.id] = this.questionDraftErrors[question.id] || '';
      });

      this.questionDrafts = nextDrafts;
      this.questionDraftErrors = nextErrors;
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
    openQuestionDialog() {
      this.handleCreateQuestionDialogChange(true);
    },
    openActivationDialog() {
      if (this.hasAnyActiveBranch) {
        this.openManageDialog();
        return;
      }

      this.activationBranch = this.selectedBranch || this.branchOptions[0]?.value || 'male';
      this.activationPreserveOtherBranch = false;
      this.activationError = '';
      this.activationSubmitting = false;
      this.activationDialogOpen = true;
    },
    closeActivationDialog() {
      if (this.activationSubmitting) {
        return;
      }

      this.activationDialogOpen = false;
      this.activationError = '';
      this.activationBranch = this.selectedBranch || this.branchOptions[0]?.value || 'male';
      this.activationPreserveOtherBranch = false;
    },
    openManageDialog() {
      this.manageChoice = this.manageOptions[0]?.value || '';
      this.manageSubmitting = false;
      this.manageDialogOpen = true;
    },
    closeManageDialog() {
      if (this.manageSubmitting) {
        return;
      }

      this.manageDialogOpen = false;
      this.manageChoice = '';
    },
    triggerCopyQuestions() {
      this.copySubmitting = false;
      this.copyDialogOpen = true;
    },
    closeCopyDialog() {
      if (this.copySubmitting) {
        return;
      }

      this.copyDialogOpen = false;
    },
    async confirmActivation() {
      const minutes = Number(this.openDurationMinutes);

      if (!Number.isFinite(minutes) || minutes <= 0) {
        this.activationError = 'أدخل مدة فتح صحيحة بالدقائق';
        return;
      }

      this.activationSubmitting = true;

      try {
        await this.applyActivation(this.activationBranch, this.activationPreserveOtherBranch);
        this.activationDialogOpen = false;
        this.activationError = '';
        this.$toast.success('تم تفعيل الاختبار النهائي');
      } catch (error) {
        this.activationError = error?.response?.data?.message || 'تعذر حفظ الإعدادات';
      } finally {
        this.activationSubmitting = false;
      }
    },
    async applyActivation(branchCode, preserveOtherBranch = false) {
      const closesAt = this.formatDateTimeForApi(new Date(Date.now() + (Number(this.openDurationMinutes) * 60000)));
      const targetBranches = branchCode === 'all' ? ['male', 'female'] : [branchCode];
      const otherBranches = ['male', 'female'].filter((value) => !targetBranches.includes(value));

      await Promise.all(targetBranches.map((targetBranch) => this.toggleFinalExamEnabled({
        branchCode: targetBranch,
        closesAt,
      })));

      if (!preserveOtherBranch && branchCode !== 'all') {
        await Promise.all(otherBranches
          .filter((otherBranch) => this.isBranchActive(otherBranch))
          .map((otherBranch) => this.toggleFinalExamEnabled({
            branchCode: otherBranch,
            closesAt: null,
          })));
      }
    },
    async closeBranches(branches) {
      await Promise.all(branches
        .filter((branchCode) => this.isBranchActive(branchCode))
        .map((branchCode) => this.toggleFinalExamEnabled({
          branchCode,
          closesAt: null,
        })));
    },
    async confirmManageAction() {
      if (!this.manageChoice) {
        return;
      }

      this.manageSubmitting = true;

      try {
        if (this.manageChoice.startsWith('close_')) {
          const branchCode = this.manageChoice.replace('close_', '');
          await this.closeBranches(branchCode === 'all' ? ['male', 'female'] : [branchCode]);
          this.$toast.success('تم تحديث حالة الاختبار النهائي');
          this.closeManageDialog();
          return;
        }

        const branchCode = this.manageChoice.replace('open_', '');
        this.closeManageDialog();
        this.activationBranch = branchCode === 'all' ? 'all' : branchCode;
        this.activationPreserveOtherBranch = branchCode !== 'all';
        this.activationError = '';
        this.activationSubmitting = false;
        this.activationDialogOpen = true;
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة الاختبار النهائي');
      } finally {
        this.manageSubmitting = false;
      }
    },
    formatDateTimeForApi(value) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      const seconds = String(value.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    async copyQuestions(move) {
      try {
        await this.copyFinalExamQuestions({
          from: this.selectedBranch,
          to: this.selectedBranch === 'male' ? 'female' : 'male',
          move,
        });
        this.$toast.success(move ? 'تم نقل الأسئلة' : 'تم نسخ الأسئلة');
        return true;
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تنفيذ العملية');
        return false;
      }
    },
    async confirmCopyQuestions() {
      this.copySubmitting = true;

      try {
        const copied = await this.copyQuestions(false);

        if (copied) {
          this.copyDialogOpen = false;
        }
      } finally {
        this.copySubmitting = false;
      }
    },
};
