export const resolveAssessmentCourse = (courses = [], type, courseId = '', submissions = []) => {
  const assessments = courses.filter(course => course.entityType !== 'task');
  return assessments.find(course => course.id === courseId && (course.isActive || course.retryTypes?.includes(type)
    || submissions.some(submission => submission.courseId === courseId && submission.assessmentType === type)))
    || assessments.find(course => course.retryTypes?.includes(type))
    || assessments.find(course => course.isActive) || null;
};
