import { fetchPeopleDirectory } from '../../services/peopleDirectoryApi';

export default {
  async loadPeopleDirectory(page = this.directoryPage) {
    const generation = ++this.directoryGeneration;
    this.directoryController?.abort();
    this.directoryController = new AbortController();
    this.directoryLoading = true;
    this.directoryError = '';
    this.directoryRows = [];
    try {
      const result = await fetchPeopleDirectory({
        branchCode: this.effectiveStudentBranch,
        type: this.isReciterDirectoryMode ? 'reciter' : 'student',
        sort: this.isReciterDirectoryMode ? 'all' : this.selectedFilter,
        search: this.directorySearch.trim(), page, perPage: 20,
      }, this.directoryController.signal);
      if (generation !== this.directoryGeneration) return;
      if (page > result.last_page) {
        await this.loadPeopleDirectory(result.last_page);
        return;
      }
      this.directoryRows = result.data;
      this.directoryPage = result.current_page;
      this.directoryPages = result.last_page;
      this.directoryTotal = result.total;
    } catch (error) {
      if (generation !== this.directoryGeneration || error?.code === 'ERR_CANCELED') return;
      this.directoryError = error?.response?.data?.message || 'تعذر تحميل القائمة. حاول مرة أخرى.';
    } finally {
      if (generation === this.directoryGeneration) this.directoryLoading = false;
    }
  },
  refreshDirectory() {
    if (this.directorySearchTimer) clearTimeout(this.directorySearchTimer);
    this.loadPeopleDirectory(1);
  },
  searchDirectory(value) {
    this.directorySearch = value;
    // Invalidate the previous search immediately, before the debounce expires.
    this.directoryGeneration++;
    this.directoryController?.abort();
    this.directoryRows = [];
    this.directoryLoading = true;
    if (this.directorySearchTimer) clearTimeout(this.directorySearchTimer);
    this.directorySearchTimer = setTimeout(() => {
      this.directorySearchTimer = null;
      this.loadPeopleDirectory(1);
    }, 300);
  },
};
