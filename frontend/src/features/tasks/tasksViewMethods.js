import tasksAnswerMethods from './tasksAnswerMethods';
import tasksPublicDataMethods from './tasksPublicDataMethods';
import tasksSessionMethods from './tasksSessionMethods';

export default {
  ...tasksPublicDataMethods,
  ...tasksSessionMethods,
  ...tasksAnswerMethods,
};
