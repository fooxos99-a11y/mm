import {
  activateCourse as activateCourseRequest,
  bulkImportAssessments as bulkImportAssessmentsRequest,
  createCourse,
  createCourseQuestion,
  createTaskTemplate,
  deactivateAllCourses as deactivateAllCoursesRequest,
  deleteCourse as deleteCourseRequest,
  deleteCourseQuestion,
  saveManualAttendance,
  syncCourseQuestions as syncCourseQuestionsRequest,
  submitAssessment as submitAssessmentRequest,
  updateCourse as updateCourseRequest,
  updateCourseQuestion,
  updateCourseSortOrder,
  updateTaskTemplate as updateTaskTemplateRequest,
} from '../../services/api';

const reloadSnapshot = (dispatch) => dispatch('loadDashboardSnapshot');

export const courseActions = {
  async setManualAttendance({ dispatch }, payload) {
    await saveManualAttendance(payload);
    await reloadSnapshot(dispatch);
  },
  async submitAssessment({ dispatch }, payload) {
    const result = await submitAssessmentRequest(payload);
    await reloadSnapshot(dispatch);
    return result;
  },
  async addCourse({ dispatch }, payload) {
    const result = await createCourse(payload);
    await reloadSnapshot(dispatch);
    return result;
  },
  async addTaskTemplate({ dispatch }, payload) {
    const result = await createTaskTemplate(payload);
    await reloadSnapshot(dispatch);
    return result;
  },
  async updateTaskTemplate({ dispatch }, { templateId, updates }) {
    await updateTaskTemplateRequest(templateId, updates);
    await reloadSnapshot(dispatch);
  },
  async updateCourse({ dispatch }, { courseId, updates }) {
    await updateCourseRequest(courseId, updates);
    await reloadSnapshot(dispatch);
  },
  async deleteCourse({ dispatch }, courseId) {
    await deleteCourseRequest(courseId);
    await reloadSnapshot(dispatch);
  },
  async reorderCourses({ dispatch }, orderedIds) {
    await updateCourseSortOrder(orderedIds);
    await reloadSnapshot(dispatch);
  },
  async activateCourse({ dispatch }, { courseId, settings }) {
    await activateCourseRequest(courseId, settings);
    await reloadSnapshot(dispatch);
  },
  async deactivateAllCourses({ dispatch }) {
    await deactivateAllCoursesRequest();
    await reloadSnapshot(dispatch);
  },
  async addQuestion({ dispatch }, { courseId, question }) {
    const result = await createCourseQuestion(courseId, question);
    await reloadSnapshot(dispatch);
    return result;
  },
  async updateQuestion({ dispatch }, { questionId, question }) {
    await updateCourseQuestion(questionId, question);
    await reloadSnapshot(dispatch);
  },
  async deleteQuestion({ dispatch }, questionId) {
    await deleteCourseQuestion(questionId);
    await reloadSnapshot(dispatch);
  },
  async syncCourseQuestions({ state, commit }, { courseId, payload }) {
    const authGeneration = state.authGeneration;
    const response = await syncCourseQuestionsRequest(courseId, payload);
    if (state.authGeneration !== authGeneration || !state.dashboardSnapshot) return;
    const questionKey = { pre: 'preQuestions', post: 'postQuestions', tasks: 'taskQuestions' }[payload.assessmentType];
    commit('setDashboardSnapshot', {
      ...state.dashboardSnapshot,
      courses: state.dashboardSnapshot.courses.map(course => course.id === courseId ? {
        ...course,
        ...payload.courseUpdates,
        [questionKey]: response.data.questions,
      } : course),
    });
  },
  async bulkImportAssessments({ dispatch }, payload) {
    const result = await bulkImportAssessmentsRequest(payload);
    await reloadSnapshot(dispatch);
    return result;
  },
};
