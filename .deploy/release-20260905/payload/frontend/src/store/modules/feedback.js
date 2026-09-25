import {
  copyFinalExamQuestions as copyFinalExamQuestionsRequest,
  createFinalExamQuestion,
  createSatisfactionQuestion,
  deleteFinalExamQuestion as deleteFinalExamQuestionRequest,
  deleteSatisfactionQuestion as deleteSatisfactionQuestionRequest,
  setFinalExamManualScore as setFinalExamManualScoreRequest,
  submitFinalExam as submitFinalExamRequest,
  submitSatisfactionResponses as submitSatisfactionResponsesRequest,
  updateFinalExamNotificationTemplate as updateFinalExamNotificationTemplateRequest,
  updateFinalExamQuestion as updateFinalExamQuestionRequest,
  updateFinalExamSetting,
} from '../../services/api';

export const feedbackActions = {
  async addSatisfactionQuestion({ dispatch }, payload) {
    const result = await createSatisfactionQuestion(payload);
    await dispatch('loadDashboardSnapshot');
    return result;
  },
  async deleteSatisfactionQuestion({ dispatch }, questionId) {
    await deleteSatisfactionQuestionRequest(questionId);
    await dispatch('loadDashboardSnapshot');
  },
  async deleteSatisfactionQuestions({ dispatch }, questionIds) {
    await Promise.all((questionIds || []).map((id) => deleteSatisfactionQuestionRequest(id)));
    await dispatch('loadDashboardSnapshot');
  },
  async submitSatisfactionResponses({ dispatch }, responses) {
    const result = await submitSatisfactionResponsesRequest(responses);
    await dispatch('loadDashboardSnapshot');
    return result;
  },
  async addFinalExamQuestion({ dispatch }, payload) {
    const result = await createFinalExamQuestion(payload);
    await dispatch('loadDashboardSnapshot');
    return result;
  },
  async updateFinalExamQuestion({ dispatch }, { questionId, question }) {
    await updateFinalExamQuestionRequest(questionId, question);
    await dispatch('loadDashboardSnapshot');
  },
  async deleteFinalExamQuestion({ dispatch }, questionId) {
    await deleteFinalExamQuestionRequest(questionId);
    await dispatch('loadDashboardSnapshot');
  },
  async toggleFinalExamEnabled({ dispatch }, { branchCode, closesAt, notificationTemplate }) {
    await updateFinalExamSetting(branchCode, {
      isEnabled: closesAt !== null,
      closesAt: closesAt !== null ? closesAt : null,
      ...(notificationTemplate !== undefined ? { notificationTemplate } : {}),
    });
    await dispatch('loadDashboardSnapshot');
  },
  async updateFinalExamNotificationTemplate({ dispatch }, { branchCode, notificationTemplate }) {
    await updateFinalExamNotificationTemplateRequest(branchCode, notificationTemplate);
    await dispatch('loadDashboardSnapshot');
  },
  async submitFinalExam({ dispatch }, payload) {
    const result = await submitFinalExamRequest(payload);
    await dispatch('loadDashboardSnapshot');
    return result;
  },
  async copyFinalExamQuestions({ dispatch }, payload) {
    await copyFinalExamQuestionsRequest(payload);
    await dispatch('loadDashboardSnapshot');
  },
  async setFinalExamManualScore({ dispatch }, { submissionId, score }) {
    await setFinalExamManualScoreRequest(submissionId, score);
    await dispatch('loadDashboardSnapshot');
  },
};
