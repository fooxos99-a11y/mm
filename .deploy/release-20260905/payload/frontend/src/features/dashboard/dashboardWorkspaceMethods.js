import satisfactionMethods from './dashboardSatisfactionMethods';
import topbarMethods from './dashboardTopbarMethods';
import workspaceActionMethods from './dashboardWorkspaceActionMethods';

export default {
  ...satisfactionMethods,
  ...topbarMethods,
  ...workspaceActionMethods,
};
