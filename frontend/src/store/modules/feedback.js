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

const setFinalExamQuestions = (state, commit, questions) => commit('setDashboardSnapshot', {
  ...state.dashboardSnapshot,
  finalExamQuestions: questions,
});

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
  async addFinalExamQuestion({ state, commit }, payload) {
    const authGeneration = state.authGeneration;
    const result = await createFinalExamQuestion(payload);
    if (state.authGeneration !== authGeneration || !state.dashboardSnapshot) return result;
    setFinalExamQuestions(state, commit, [...state.dashboardSnapshot.finalExamQuestions, {
      ...payload,
      ...result,
      type: payload.type === 'text' ? 'text' : 'multiple',
      options: payload.type === 'truefalse' ? ['صح', 'خطأ'] : (payload.options || []),
    }]);
    return result;
  },
  async updateFinalExamQuestion({ state, commit }, { questionId, question }) {
    const authGeneration = state.authGeneration;
    await updateFinalExamQuestionRequest(questionId, question);
    if (state.authGeneration !== authGeneration || !state.dashboardSnapshot) return;
    setFinalExamQuestions(state, commit, state.dashboardSnapshot.finalExamQuestions.map(item => item.id === questionId ? {
      ...item,
      ...question,
      type: question.type === 'text' ? 'text' : 'multiple',
      options: question.type === 'truefalse' ? ['صح', 'خطأ'] : (question.options || []),
    } : item));
  },
  async deleteFinalExamQuestion({ state, commit }, questionId) {
    const authGeneration = state.authGeneration;
    await deleteFinalExamQuestionRequest(questionId);
    if (state.authGeneration !== authGeneration || !state.dashboardSnapshot) return;
    setFinalExamQuestions(state, commit, state.dashboardSnapshot.finalExamQuestions.filter(item => item.id !== questionId));
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
