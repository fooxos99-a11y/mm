import api from './httpClient';

const sessionsPath = courseId => `/dashboard/courses/${courseId}/attendance-sessions`;
const studentPath = session => `/students/me/attendance/${session.courseId}/${session.id}`;
export const attendanceSettings = async () => (await api.get('/dashboard/attendance/settings')).data;
export const saveAttendanceSettings = async data => (await api.put('/dashboard/attendance/settings', data)).data;
export const attendanceSessions = async courseId => (await api.get(sessionsPath(courseId))).data;
export const openAttendance = async (courseId, hours) => (await api.post(sessionsPath(courseId), { hours })).data;
export const closeAttendance = (courseId, id) => api.post(`${sessionsPath(courseId)}/${id}/close`);
export const availableAttendance = async () => (await api.get('/students/me/attendance')).data;
export const attendanceChallenge = async session => (await api.post(`${studentPath(session)}/challenge`)).data.challenge;
export const attendSession = (session, data) => api.post(studentPath(session), data);
export const courseEnrollments = async (courseId, branchCode) => (await api.get(`/dashboard/courses/${courseId}/enrollments`, { params: { branchCode } })).data;
export const saveCourseEnrollments = async (courseId, branchCode, studentIds) => (
  await api.put(`/dashboard/courses/${courseId}/enrollments`, { branchCode, studentIds })
).data;
