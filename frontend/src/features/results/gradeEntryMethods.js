import { fetchResultsPage, saveCourseScores } from '../../services/resultsDirectoryApi';
import { buildGradeRows, gradeChanges, validateGradeDraft } from './gradeEntryModel.mjs';

export default {
  async openGradeDialog() {
    if (!this.canEnterGrades) return;
    this.gradeScope = { courseId: this.resultsCourseId, assessmentType: this.resultsType,
      branchCode: this.effectiveResultsBranchId, courseTitle: this.selectedResultsSectionLabel,
      typeLabel: this.activeResultsTypeLabel };
    this.gradeRows = [];
    this.gradeSearch = '';
    this.gradeTotal = '';
    this.gradeErrors = {};
    this.gradeDialogOpen = true;
    await this.loadGradeRoster();
  },
  async loadGradeRoster(preserveDrafts = false) {
    this.gradeLoading = true;
    this.gradeLoadFailed = false;
    this.gradeError = '';
    this.gradeConflict = false;
    const generation = ++this.gradeGeneration;
    this.gradeController?.abort();
    this.gradeController = new AbortController();
    const previous = new Map(this.gradeRows.map(row => [row.id, row]));
    try {
      const snapshot = { students: [], submissions: [], scoreEntries: [], courses: [] };
      let settings = null;
      let pages = 1;
      for (let page = 1; page <= pages; page++) {
        const result = await fetchResultsPage({ courseId: this.gradeScope.courseId,
          assessmentType: this.gradeScope.assessmentType, branchCode: this.gradeScope.branchCode,
          page, perPage: 100, state: 'all' }, this.gradeController.signal);
        if (generation !== this.gradeGeneration) return;
        pages = result.pagination.pages;
        snapshot.students.push(...result.students);
        snapshot.submissions.push(...result.submissions);
        snapshot.scoreEntries.push(...(result.scoreEntries || []));
        snapshot.courses = result.courses;
        settings = result.gradeSettings;
      }
      this.gradeRows = buildGradeRows(snapshot, this.gradeScope.courseId, this.gradeScope.assessmentType)
        .map(row => {
          const old = previous.get(row.id);
          return preserveDrafts && old && gradeChanges([old]).length
            ? { ...row, value: old.value, clear: old.clear } : row;
        });
      this.gradeTotal = settings?.totalPoints ?? (preserveDrafts ? this.gradeTotal : '');
      this.gradeTotalLocked = Boolean(settings?.totalLocked);
      this.gradeErrors = {};
    } catch (error) {
      if (generation === this.gradeGeneration && error?.code !== 'ERR_CANCELED') {
        this.gradeError = error?.response?.data?.message || 'تعذّر تحميل الدرجات. حاول مرة أخرى.';
        this.gradeLoadFailed = true;
      }
    } finally {
      if (generation === this.gradeGeneration) this.gradeLoading = false;
    }
  },
  updateGradeDraft({ id, value }) {
    const row = this.gradeRows.find(item => item.id === id);
    if (!row) return;
    row.value = value;
    row.clear = false;
    this.gradeErrors = { ...this.gradeErrors, [id]: '' };
  },
  toggleGradeClear(id) {
    const row = this.gradeRows.find(item => item.id === id);
    if (!row?.manual) return;
    row.clear = !row.clear;
    row.value = row.clear ? '' : String(row.initialScore ?? '');
    this.gradeErrors = { ...this.gradeErrors, [id]: '' };
  },
  closeGradeDialog() {
    if (this.gradeSaving) return;
    this.gradeDialogOpen = false;
    this.gradeController?.abort();
    this.gradeGeneration++;
  },
  async saveGradeDrafts() {
    if (this.gradeSaving || this.gradeLoading || this.gradeConflict || this.gradeLoadFailed) return;
    this.gradeErrors = validateGradeDraft(this.gradeRows, this.gradeTotal);
    if (Object.values(this.gradeErrors).some(Boolean)) {
      this.gradeSearch = '';
      this.$nextTick(() => document.querySelector('.grade-dialog [aria-invalid="true"]')?.focus());
      return;
    }
    const grades = gradeChanges(this.gradeRows);
    if (!grades.length) return;
    this.gradeSaving = true;
    this.gradeError = '';
    try {
      await saveCourseScores({ courseId: this.gradeScope.courseId, assessmentType: this.gradeScope.assessmentType,
        branchCode: this.gradeScope.branchCode, totalPoints: Number(this.gradeTotal), grades });
      this.gradeDialogOpen = false;
      this.gradeRows = [];
      this.$toast.success('حُفظت الدرجات');
      if (!await this.loadResultsPage(this.resultsPage, true)) {
        this.$toast.warning('حُفظت الدرجات، لكن تعذّر تحديث النتائج. أعد تحميلها.');
      }
    } catch (error) {
      this.gradeConflict = error?.response?.status === 409;
      this.gradeError = error?.response?.data?.message || 'تعذّر حفظ الدرجات. تعديلاتك محفوظة في النافذة.';
      for (const [key, messages] of Object.entries(error?.response?.data?.errors || {})) {
        const index = key.match(/^grades\.(\d+)\.score$/)?.[1];
        this.gradeErrors[index !== undefined ? grades[index]?.studentId : key] = messages[0];
      }
    } finally {
      this.gradeSaving = false;
    }
  },
};
