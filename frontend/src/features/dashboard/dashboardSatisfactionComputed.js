export default {
  satisfactionCourseOptions() {
    return [...((this.dashboardSnapshot?.courses || []).filter((course) => course.entityType !== 'task' && course.isPostEnabled))]
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
      .map((course) => ({ label: course.title, value: course.id }));
  },
  selectedSatisfactionCourse() {
    const selected = (this.dashboardSnapshot?.courses || []).find((course) => course.id === this.selectedSatisfactionCourseId);
    if (selected) return selected;

    const [firstOption] = this.satisfactionCourseOptions;
    return (this.dashboardSnapshot?.courses || []).find((course) => course.id === firstOption?.value) || null;
  },
  selectedSatisfactionQuestions() {
    if (!this.selectedSatisfactionCourse) return [];

    return [...(this.dashboardSnapshot?.satisfactionQuestions || [])]
      .filter((question) => question.courseId === this.selectedSatisfactionCourse.id)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  },
  satisfactionQuestionOptions() {
    const seen = new Set();

    return this.selectedSatisfactionQuestions
      .filter((question) => {
        const key = this.getSatisfactionQuestionKey(question);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((question) => ({
        label: `${question.prompt} - ${question.type === 'rating' ? 'تقييم' : 'نصي'}`,
        value: this.getSatisfactionQuestionKey(question),
      }));
  },
  selectedSatisfactionDeleteQuestions() {
    return (this.dashboardSnapshot?.satisfactionQuestions || []).filter((question) => (
      this.getSatisfactionQuestionKey(question) === this.selectedSatisfactionDeleteKey
    ));
  },
  selectedSatisfactionResponses() {
    if (!this.selectedSatisfactionCourse) return [];
    return (this.dashboardSnapshot?.satisfactionResponses || []).filter((response) => response.courseId === this.selectedSatisfactionCourse.id);
  },
  satisfactionRatingIndicators() {
    return this.selectedSatisfactionQuestions
      .filter((question) => question.type === 'rating')
      .map((question) => {
        const values = this.selectedSatisfactionResponses
          .filter((response) => response.questionId === question.id && response.ratingValue !== null && response.ratingValue !== undefined)
          .map((response) => Number(response.ratingValue))
          .filter((value) => Number.isFinite(value));
        const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

        return {
          id: question.id,
          label: question.prompt,
          count: values.length,
          average,
          progress: average === null ? 0 : average * 10,
          display: average === null ? '--' : average.toFixed(1),
        };
      });
  },
  satisfactionQuestionTypeOptions() {
    return [
      { label: 'تقييم من 1 إلى 10', value: 'rating' },
      { label: 'إجابة نصية', value: 'text' },
    ];
  },
  hasSatisfactionCourses() {
    return (this.dashboardSnapshot?.courses || []).some((course) => course.entityType !== 'task' && course.isPostEnabled);
  },
  hasSatisfactionQuestions() {
    return (this.dashboardSnapshot?.satisfactionQuestions || []).length > 0;
  },
};
