import apiClient from './httpClient';

export const createStudent = async (payload) => {
  const response = await apiClient.post('/students', payload);
  return response.data;
};

export const updateStudent = async (studentId, payload) => {
  const response = await apiClient.put(`/students/${studentId}`, payload);
  return response.data;
};

export const deleteStudent = (studentId) => apiClient.delete(`/students/${studentId}`);

export const saveReciter = async (payload) => {
  const response = await apiClient.post('/reciters', payload);
  return response.data;
};

export const transferStudentToReciter = (studentId, targetReciterId) => apiClient.post(
  '/dashboard/transfer-student',
  { studentId, targetReciterId },
);

export const fetchReciterByLoginCode = async (loginCode) => {
  const response = await apiClient.get(`/reciters/by-login/${encodeURIComponent(loginCode)}`);
  return response.data;
};

export const fetchStudentAssignedReciter = async (loginCode) => {
  const response = await apiClient.get(`/students/by-login/${encodeURIComponent(loginCode)}/assigned-reciter`);
  return response.data;
};

export const toggleStudentPart = ({ studentId, partNumber, reciterId, shouldMarkComplete }) => apiClient.put(
  `/students/${encodeURIComponent(studentId)}/parts/${partNumber}`,
  { reciterId, shouldMarkComplete },
);

export const deleteReciter = (loginCode) => apiClient.delete(`/reciters/by-login/${encodeURIComponent(loginCode)}`);
