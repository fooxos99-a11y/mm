import actionsComputed from './adminAssessmentActionsComputed';
import attendanceComputed from './adminAssessmentAttendanceComputed';
import courseComputed from './adminAssessmentCourseComputed';
import indicatorsComputed from './adminAssessmentIndicatorsComputed';

export default {
  ...courseComputed,
  ...indicatorsComputed,
  ...attendanceComputed,
  ...actionsComputed,
};
