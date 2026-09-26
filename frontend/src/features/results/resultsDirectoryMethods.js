import { fetchResultsCatalog, fetchResultsPage } from '../../services/resultsDirectoryApi';

const resolveResultsAssessmentType = (vm) => {
  if (vm.isFinalExamResultsSection) return 'final';
  return vm.isTaskResultsSection ? 'tasks' : vm.resultsType;
};

export default {
  async loadResultsCatalog() {
    this.resultsLoading = true;
    this.resultsError = '';
    try {
      this.resultsCatalog = await fetchResultsCatalog();
      this.resultsCatalogReady = true;
    } catch (error) {
      this.resultsError = error?.response?.data?.message || 'تعذر تحميل أقسام النتائج.';
    } finally {
      this.resultsLoading = false;
    }
  },
  queueResultsPage(delay = 0) {
    if (this.isAttendanceMode) return;
    this.resultsGeneration++;
    this.resultsController?.abort();
    clearTimeout(this.resultsSearchTimer);
    this.resultSnapshot = null;
    this.resultsPage = 1;
    this.resultsLoading = this.hasSelectedResultsSection;
    this.closeResultDialog();
    this.resultsSearchTimer = setTimeout(() => this.loadResultsPage(1), delay);
  },
  searchResults(value) {
    this.resultsSearch = value;
    this.queueResultsPage(300);
  },
  async retryResults() {
    if (!this.resultsCatalogReady) await this.loadResultsCatalog();
    else await this.loadResultsPage(this.resultsPage);
  },
  async loadResultsPage(page = this.resultsPage, preserve = false) {
    if (!this.hasSelectedResultsSection || this.isAttendanceMode) {
      this.resultsLoading = false;
      return false;
    }
    const generation = ++this.resultsGeneration;
    this.resultsController?.abort();
    this.resultsController = new AbortController();
    clearTimeout(this.resultsSearchTimer);
    this.resultsLoading = true;
    this.resultsError = '';
    if (!preserve) {
      this.closeResultDialog();
      this.resultSnapshot = null;
    }
    try {
      const result = await fetchResultsPage({
        branchCode: this.effectiveResultsBranchId,
        courseId: this.isFinalExamResultsSection ? undefined : this.resultsCourseId.replace(/^task:/, ''),
        assessmentType: resolveResultsAssessmentType(this),
        state: this.isAttendanceResultsType ? (this.studentFilter || 'all') : 'all',
        search: this.resultsSearch.trim(), page, perPage: 20,
      }, this.resultsController.signal);
      if (generation !== this.resultsGeneration) return false;
      if (page > result.pagination.pages) return this.loadResultsPage(result.pagination.pages, preserve);
      this.resultSnapshot = result;
      this.resultsPage = result.pagination.page;
      return true;
    } catch (error) {
      if (generation !== this.resultsGeneration || error?.code === 'ERR_CANCELED') return false;
      this.resultsError = error?.response?.data?.message || 'تعذر تحميل النتائج. حاول مرة أخرى.';
      return false;
    } finally {
      if (generation === this.resultsGeneration) this.resultsLoading = false;
    }
  },
  async reloadResultsAfterSave() {
    if (this.isAttendanceMode) return this.loadDashboardSnapshot();
    if (!await this.loadResultsPage(this.resultsPage, true)) {
      throw new Error('تم الحفظ، لكن تعذر تحديث عرض النتائج. أعد تحميل النتائج.');
    }
    await this.loadDashboardSnapshot({ mode: 'shell' });
  },
};
