import accessComputed from './dashboardAccessComputed';
import overviewComputed from './dashboardOverviewComputed';
import satisfactionComputed from './dashboardSatisfactionComputed';
import workspaceComputed from './dashboardWorkspaceComputed';

export default {
  ...accessComputed,
  ...overviewComputed,
  ...satisfactionComputed,
  ...workspaceComputed,
};
