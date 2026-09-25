import api from './api';

export const listArchives = () => api.get('/dashboard/archives');
export const getArchive = (archiveId) => api.get(`/dashboard/archives/${archiveId}`);
export const removeArchive = (archiveId) => api.delete(`/dashboard/archives/${archiveId}`);
export const searchArchivedStudents = (name) => api.get('/dashboard/archives/search/students', {
  params: { name },
});
export const getArchivedStudent = (archiveId, studentId) => (
  api.get(`/dashboard/archives/${archiveId}/students/${studentId}`)
);
export const createArchive = (payload) => api.post('/dashboard/archives', payload);
export const addArchivedStudent = (archiveId, name) => (
  api.post(`/dashboard/archives/${archiveId}/students`, { name })
);
export const archiveCurrentContent = (payload) => api.post('/dashboard/archives/archive-all', payload);
