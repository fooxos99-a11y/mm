const partsLimitForStudent = (student) => (student?.branchId === 'female' ? 10 : 30);

const completionRate = (count, total) => {
  if (!total) {
    return 0;
  }

  return (count / total) * 100;
};

const normalizeValue = (value) => String(value || '').trim();

const makeKey = (...parts) => parts.map((part) => normalizeValue(part)).join('::');

const isNonTaskCourse = (course) => course?.entityType !== 'task';

const isTaskCourse = (course) => course?.entityType === 'task';

const assessmentEnabledKey = {
  pre: 'isPreEnabled',
  post: 'isPostEnabled',
  tasks: 'isTasksEnabled',
};

const assessmentCourseMatcher = {
  pre: isNonTaskCourse,
  post: isNonTaskCourse,
  tasks: isTaskCourse,
};

const isAssessmentEligibleForStudent = (course, student, assessmentType) => {
  if (!course || !student || !assessmentCourseMatcher[assessmentType]?.(course)) {
    return false;
  }

  const enabledKey = assessmentEnabledKey[assessmentType];

  if (!enabledKey || !course[enabledKey]) {
    return false;
  }

  const branchId = normalizeValue(student.branchId);

  if (!branchId) {
    return true;
  }

  return course.branchAvailability?.[branchId]?.[assessmentType] !== false;
};

const countEligibleAssessmentSlots = (students, courses, assessmentType) => (
  (students || []).reduce((sum, student) => sum + (courses || []).filter((course) => (
    isAssessmentEligibleForStudent(course, student, assessmentType)
  )).length, 0)
);

const countCompletedAssessmentSlots = (students, courses, submissions, assessmentType) => {
  const eligibleKeys = new Set(
    (students || []).flatMap((student) => (
      (courses || [])
        .filter((course) => isAssessmentEligibleForStudent(course, student, assessmentType))
        .map((course) => makeKey(course.id, assessmentType, student.loginId))
    )),
  );

  return new Set(
    (submissions || [])
      .filter((submission) => submission.assessmentType === assessmentType)
      .map((submission) => makeKey(submission.courseId, submission.assessmentType, submission.loginId))
      .filter((key) => eligibleKeys.has(key)),
  ).size;
};

const countEligibleAttendanceSlots = (students, courses) => {
  const attendanceCoursesCount = (courses || []).filter(isNonTaskCourse).length;
  return (students || []).length * attendanceCoursesCount;
};

const countCompletedAttendanceSlots = (students, courses, attendance) => {
  const eligibleCourseIds = new Set((courses || []).filter(isNonTaskCourse).map((course) => normalizeValue(course.id)));
  const eligibleLoginIds = new Set((students || []).map((student) => normalizeValue(student.loginId)).filter(Boolean));

  return new Set(
    (attendance || [])
      .map((record) => ({
        courseId: normalizeValue(record.courseId),
        loginId: normalizeValue(record.loginId),
      }))
      .filter((record) => eligibleCourseIds.has(record.courseId) && eligibleLoginIds.has(record.loginId))
      .map((record) => makeKey(record.courseId, record.loginId)),
  ).size;
};

export const buildProgramIndicators = ({ students = [], courses = [], submissions = [], attendance = [] } = {}) => {
  const totalCompletedParts = students.reduce((sum, student) => {
    const completedParts = Array.isArray(student.completedParts) ? [...new Set(student.completedParts)] : [];
    return sum + completedParts.length;
  }, 0);
  const totalRequiredParts = students.reduce((sum, student) => sum + partsLimitForStudent(student), 0);
  const attendanceCompletedSlots = countCompletedAttendanceSlots(students, courses, attendance);
  const attendanceEligibleSlots = countEligibleAttendanceSlots(students, courses);
  const preCompletedSlots = countCompletedAssessmentSlots(students, courses, submissions, 'pre');
  const preEligibleSlots = countEligibleAssessmentSlots(students, courses, 'pre');
  const postCompletedSlots = countCompletedAssessmentSlots(students, courses, submissions, 'post');
  const postEligibleSlots = countEligibleAssessmentSlots(students, courses, 'post');
  const tasksCompletedSlots = countCompletedAssessmentSlots(students, courses, submissions, 'tasks');
  const tasksEligibleSlots = countEligibleAssessmentSlots(students, courses, 'tasks');
  const completed30 = students.filter((student) => {
    const completedParts = Array.isArray(student.completedParts) ? [...new Set(student.completedParts)] : [];
    return student.isCertified || completedParts.length >= partsLimitForStudent(student);
  }).length;
  const attendanceProgress = completionRate(attendanceCompletedSlots, attendanceEligibleSlots);
  const preProgress = completionRate(preCompletedSlots, preEligibleSlots);
  const postProgress = completionRate(postCompletedSlots, postEligibleSlots);
  const tasksProgress = completionRate(tasksCompletedSlots, tasksEligibleSlots);
  const memorizationProgress = completionRate(totalCompletedParts, totalRequiredParts);
  const completionProgress = completionRate(completed30, students.length);

  return [
    { key: 'memorization', label: 'مجموع الأجزاء المقروءة', display: String(totalCompletedParts), meta: `${totalCompletedParts} من ${totalRequiredParts}`, progress: memorizationProgress },
    { key: 'attendance', label: 'الحضور', display: `${Math.round(attendanceProgress)}%`, meta: `${attendanceCompletedSlots} من ${attendanceEligibleSlots}`, progress: attendanceProgress },
    { key: 'pre', label: 'الاختبار القبلي', display: `${Math.round(preProgress)}%`, meta: `${preCompletedSlots} من ${preEligibleSlots}`, progress: preProgress },
    { key: 'post', label: 'الاختبار البعدي', display: `${Math.round(postProgress)}%`, meta: `${postCompletedSlots} من ${postEligibleSlots}`, progress: postProgress },
    { key: 'tasks', label: 'المهام الأدائية', display: `${Math.round(tasksProgress)}%`, meta: `${tasksCompletedSlots} من ${tasksEligibleSlots}`, progress: tasksProgress },
    { key: 'completed30', label: 'من أكملوا الأجزاء المطلوبة', display: String(completed30), meta: `${completed30} من ${students.length}`, progress: completionProgress },
  ];
};
