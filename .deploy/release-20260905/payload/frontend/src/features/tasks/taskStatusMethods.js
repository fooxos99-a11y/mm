import { arrayMove, branchLabels } from './taskViewModel.mjs';

export const taskStatusMethods = {
    branchLabel(branchId) {
      return branchLabels[branchId] || '';
    },
    getWindowMeta(value) {
      if (!value) {
        return { closesAt: '', durationMinutes: 0 };
      }

      if (typeof value === 'string') {
        return { closesAt: value, durationMinutes: 0 };
      }

      return {
        closesAt: value.closesAt || '',
        durationMinutes: Number(value.durationMinutes) || 0,
      };
    },
    isTaskBranchActive(task, branchId) {
      if (!task || !branchId) {
        return false;
      }

      const branchEnabled = task.branchAvailability?.[branchId]?.tasks !== false;
      const branchWindow = this.getWindowMeta(task.assessmentWindows?.[branchId]?.tasks).closesAt;

      return Boolean(task.isTasksEnabled && branchEnabled && branchWindow);
    },
    isTaskActive(task, branchId = '') {
      const targetBranch = branchId || this.managedBranchId;

      if (targetBranch) {
        return this.isTaskBranchActive(task, targetBranch);
      }

      return this.isTaskBranchActive(task, 'male') || this.isTaskBranchActive(task, 'female');
    },
    taskStatusLabel(task) {
      const maleActive = this.isTaskBranchActive(task, 'male');
      const femaleActive = this.isTaskBranchActive(task, 'female');

      if (this.managedBranchId) {
        return maleActive || femaleActive ? `مفتوحة لفرع ${this.managedBranchLabel}` : 'مغلقة';
      }

      if (maleActive && femaleActive) {
        return 'مفتوحة للكل';
      }

      if (maleActive) {
        return 'مفتوحة للمعلمين';
      }

      if (femaleActive) {
        return 'مفتوحة للمعلمات';
      }

      return 'مغلقة';
    },
    taskDeadlineLabel(task) {
      if (this.managedBranchId) {
        return this.formatDateTime(this.getWindowMeta(task.assessmentWindows?.[this.managedBranchId]?.tasks).closesAt);
      }

      const globalDeadline = this.getWindowMeta(task.assessmentWindows?.global?.tasks).closesAt;
      if (globalDeadline) {
        return this.formatDateTime(globalDeadline);
      }

      const maleDeadline = this.getWindowMeta(task.assessmentWindows?.male?.tasks).closesAt;
      const femaleDeadline = this.getWindowMeta(task.assessmentWindows?.female?.tasks).closesAt;
      const fallback = maleDeadline || femaleDeadline;

      return this.formatDateTime(fallback);
    },
    taskActionLabel(task) {
      if (!this.isTaskActive(task)) {
        return 'بدء';
      }

      const maleActive = this.isTaskBranchActive(task, 'male');
      const femaleActive = this.isTaskBranchActive(task, 'female');

      if (this.managedBranchId) {
        return this.formatCountdown(this.getWindowMeta(task.assessmentWindows?.[this.managedBranchId]?.tasks).closesAt);
      }

      if (maleActive && femaleActive) {
        return this.formatCountdown(this.getWindowMeta(task.assessmentWindows?.global?.tasks).closesAt);
      }

      const branchId = maleActive ? 'male' : 'female';
      return `${this.branchLabel(branchId)} ${this.formatCountdown(this.getWindowMeta(task.assessmentWindows?.[branchId]?.tasks).closesAt)}`;
    },
    formatDateTime(value) {
      if (!value) {
        return '';
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return '';
      }

      return new Intl.DateTimeFormat('ar-SA', {
        hour: 'numeric',
        minute: '2-digit',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(parsed);
    },
    formatCountdown(value) {
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
    openTask(taskId) {
      this.selectedTaskId = taskId;
    },
    closeTaskEditor() {
      this.selectedTaskId = '';
    },
    handleTaskDragStart(taskId, event) {
      if (!this.canEdit) {
        return;
      }

      this.dragTaskId = taskId;
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', taskId);
      }
    },
    handleTaskDragOver(taskId) {
      if (!this.canEdit || !this.dragTaskId || this.dragTaskId === taskId) {
        return;
      }
    },
    async handleTaskDrop(targetTaskId) {
      if (!this.canEdit || !this.dragTaskId || this.dragTaskId === targetTaskId) {
        this.dragTaskId = '';
        return;
      }

      const ids = this.tasks.map((task) => task.id);
      const fromIndex = ids.indexOf(this.dragTaskId);
      const toIndex = ids.indexOf(targetTaskId);

      this.dragTaskId = '';

      if (fromIndex === -1 || toIndex === -1) {
        return;
      }

      try {
        await this.reorderCourses(arrayMove(ids, fromIndex, toIndex));
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ ترتيب المهام');
      }
    },
    handleTaskDragEnd() {
      this.dragTaskId = '';
    },
    handleCurrentAssessmentAvailabilityAction() {
      this.$refs.assessmentPanel?.handleCurrentAssessmentAvailabilityAction?.();
    },
};
