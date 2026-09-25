import apiClient from './httpClient';
import { buildAssessmentSubmissionFormData, multipartRequestConfig } from './multipartPayload.mjs';

export const createFinalExamQuestion = async (payload) => {
  const response = await apiClient.post('/dashboard/final-exam/questions', payload);
  return response.data;
};

export const updateFinalExamQuestion = (questionId, payload) => apiClient.put(
  `/dashboard/final-exam/questions/${questionId}`,
  payload,
);
export const deleteFinalExamQuestion = (questionId) => apiClient.delete(`/dashboard/final-exam/questions/${questionId}`);
export const updateFinalExamSetting = (branchCode, payload) => apiClient.put(`/dashboard/final-exam/settings/${branchCode}`, payload);
export const updateFinalExamNotificationTemplate = (branchCode, notificationTemplate) => apiClient.put(
  `/dashboard/final-exam/settings/${branchCode}/notification-template`,
  { notificationTemplate },
);

export const submitFinalExam = async (payload) => {
  const formData = buildAssessmentSubmissionFormData(
    payload,
    ['branchCode', 'studentName', 'loginCode'],
  );
  const response = await apiClient.post('/dashboard/final-exam/submissions', formData, multipartRequestConfig);
  return response.data;
};

export const submitPublicFinalExam = async (payload) => {
  const formData = buildAssessmentSubmissionFormData(
    payload,
    ['branchCode', 'studentName', 'loginCode'],
  );
  const response = await apiClient.post('/public/final-exam/submissions', formData, multipartRequestConfig);
  return response.data;
};

export const copyFinalExamQuestions = (payload) => apiClient.post('/dashboard/final-exam/questions/copy', payload);
export const setFinalExamManualScore = (submissionId, score) => apiClient.put(
  `/dashboard/final-exam/submissions/${submissionId}/manual-score`,
  { score },
);
export const setFinalExamAnswerManualScore = (submissionId, answerId, score) => apiClient.put(
  `/dashboard/final-exam/submissions/${submissionId}/answers/${answerId}/manual-score`,
  { score },
);
