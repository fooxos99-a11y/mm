import {
  createStudent,
  deleteReciter as deleteReciterRequest,
  deleteStudent as deleteStudentRequest,
  saveReciter as saveReciterRequest,
  updateStudent as updateStudentRequest,
} from '../../services/api';
import {
  createDashboardAccount as createDashboardAccountRequest,
  deleteDashboardAccount as deleteDashboardAccountRequest,
  fetchDashboardAccounts as fetchDashboardAccountsRequest,
} from '../../services/dashboardAccountsApi';

export const peopleActions = {
  fetchDashboardAccounts() {
    return fetchDashboardAccountsRequest();
  },
  createDashboardAccount(_context, payload) {
    return createDashboardAccountRequest(payload);
  },
  async deleteDashboardAccount(_context, accountId) {
    await deleteDashboardAccountRequest(accountId);
  },
  async addStudent({ dispatch }, payload) {
    const result = await createStudent(payload);
    await dispatch('refreshDashboardSnapshot');
    return result;
  },
  async updateStudent({ dispatch }, { studentId, updates }) {
    const result = await updateStudentRequest(studentId, updates);
    await dispatch('refreshDashboardSnapshot');
    return result;
  },
  async deleteStudent({ dispatch }, studentId) {
    await deleteStudentRequest(studentId);
    await dispatch('refreshDashboardSnapshot').catch(() => {});
  },
  async saveReciter({ dispatch }, payload) {
    const { backgroundRefresh = false, ...record } = payload;
    const result = await saveReciterRequest(record);
    await dispatch('refreshDashboardSnapshot', { background: backgroundRefresh });
    return result;
  },
  async deleteReciter({ dispatch }, loginCode) {
    await deleteReciterRequest(loginCode);
    await dispatch('refreshDashboardSnapshot').catch(() => {});
  },
};
