import assessmentAvailabilityDialogMethods from './assessmentAvailabilityDialogMethods';
import assessmentCourseDialogMethods from './assessmentCourseDialogMethods';
import assessmentManageDialogMethods from './assessmentManageDialogMethods';

export default {
  ...assessmentAvailabilityDialogMethods,
  ...assessmentManageDialogMethods,
  ...assessmentCourseDialogMethods,
};
