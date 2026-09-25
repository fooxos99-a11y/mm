import assessmentAttendanceMethods from './assessmentAttendanceMethods';
import assessmentQuestionFormMethods from './assessmentQuestionFormMethods';
import assessmentQuestionSaveMethods from './assessmentQuestionSaveMethods';

export default {
  ...assessmentAttendanceMethods,
  ...assessmentQuestionFormMethods,
  ...assessmentQuestionSaveMethods,
};
