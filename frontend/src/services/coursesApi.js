import apiClient from './httpClient';

const normalizeCoursePayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object' || !Object.hasOwn(payload, 'taskTemplateContent')) {
    return payload;
  }

  const value = payload.taskTemplateContent;
  return {
    ...payload,
    taskTemplateContent: value == null || typeof value === 'string' ? value : JSON.stringify(value),
  };
};

export const createCourse = async (payload) => {
  const response = await apiClient.post('/dashboard/courses', normalizeCoursePayload(payload));
  return response.data;
};

export const updateCourse = (courseId, payload) => apiClient.put(
  `/dashboard/courses/${courseId}`,
  normalizeCoursePayload(payload),
);

export const deleteCourse = (courseId) => apiClient.delete(`/dashboard/courses/${courseId}`);
export const updateCourseSortOrder = (orderedIds) => apiClient.put('/dashboard/courses/sort-order', { orderedIds });
export const activateCourse = (courseId, settings) => apiClient.post(`/dashboard/courses/${courseId}/activate`, settings || {});
export const deactivateAllCourses = () => apiClient.post('/dashboard/courses/deactivate-all');

export const createCourseQuestion = async (courseId, payload) => {
  const response = await apiClient.post(`/dashboard/courses/${courseId}/questions`, payload);
  return response.data;
};

export const updateCourseQuestion = (questionId, payload) => apiClient.put(`/dashboard/questions/${questionId}`, payload);
export const deleteCourseQuestion = (questionId) => apiClient.delete(`/dashboard/questions/${questionId}`);
export const syncCourseQuestions = (courseId, payload) => apiClient.put(`/dashboard/courses/${courseId}/questions/sync`, payload);
