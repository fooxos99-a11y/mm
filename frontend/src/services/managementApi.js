import apiClient from './httpClient';

export const fetchDepartments = async () => (await apiClient.get('/management/departments')).data;
export const lookupManagementAccount = async (loginCode) => (await apiClient.get('/management/accounts', { params: { loginCode } })).data;
export const saveDepartment = async (id, payload) => (await (id
  ? apiClient.put(`/management/departments/${encodeURIComponent(id)}`, payload)
  : apiClient.post('/management/departments', payload))).data;
export const updateDepartmentContext = async (departmentId) => (await apiClient.put('/management/context', { departmentId })).data;
export const fetchManagementOverview = async (departmentId) => (await apiClient.get('/management/overview', { params: departmentId ? { departmentId } : {} })).data;
export const fetchManagementArchives = async (departmentId) => (await apiClient.get('/management/archives', { params: departmentId ? { departmentId } : {} })).data;
export const fetchManagementArchive = async (id) => (await apiClient.get(`/management/archives/${encodeURIComponent(id)}`)).data;
export const fetchManagementRecords = async (params) => (await apiClient.get('/management/records', { params })).data;
export const fetchManagementCurrentStudent = async (id) => (await apiClient.get(`/management/students/${encodeURIComponent(id)}`)).data;
export const fetchManagementArchivedStudent = async (archiveId, studentId) => (await apiClient.get(`/management/archives/${encodeURIComponent(archiveId)}/students/${encodeURIComponent(studentId)}`)).data;

export const searchManagementArchivedStudents = async (name, departmentId) => (await apiClient.get('/management/archives/search/students', { params: { name, ...(departmentId ? { departmentId } : {}) } })).data;
