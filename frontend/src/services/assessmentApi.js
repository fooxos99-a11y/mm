import apiClient from './httpClient';
import { buildAssessmentSubmissionFormData, multipartRequestConfig } from './multipartPayload.mjs';

export const saveManualAttendance = ({ courseId, presentStudents, branchCode }) => apiClient.post(
  '/dashboard/manual-attendance',
  { courseId, presentStudents, branchCode },
);

const assessmentPayload = ({ courseId, assessmentType, studentName, loginId, answers }) => ({
  courseId,
  assessmentType,
  studentName,
  loginId,
  answers,
});

export const submitAssessment = async (payload) => {
  const formData = buildAssessmentSubmissionFormData(
    assessmentPayload(payload),
    ['courseId', 'assessmentType', 'studentName', 'loginId'],
  );
  const response = await apiClient.post('/dashboard/assessment-submissions', formData, multipartRequestConfig);
  return response.data;
};

export const submitPublicAssessment = async (payload) => {
  const formData = buildAssessmentSubmissionFormData(
    assessmentPayload(payload),
    ['courseId', 'assessmentType', 'studentName', 'loginId'],
  );
  const response = await apiClient.post('/public/assessment-submissions', formData, multipartRequestConfig);
  return response.data;
};

export const bulkImportAssessments = async ({ courseId, assessmentType, submissions }) => {
  const response = await apiClient.post('/dashboard/assessment-import', {
    courseId,
    assessmentType,
    submissions,
  });
  return response.data;
};

export const setAssessmentManualScore = (submissionId, score) => apiClient.put(
  `/dashboard/assessment-submissions/${submissionId}/manual-score`,
  { score },
);

export const setAssessmentAnswerManualScore = (submissionId, answerId, score) => apiClient.put(
  `/dashboard/assessment-submissions/${submissionId}/answers/${answerId}/manual-score`,
  { score },
);

export const setTaskReviewStatus = (submissionId, status) => apiClient.put(
  `/dashboard/assessment-submissions/${submissionId}/task-review`,
  { status },
);
