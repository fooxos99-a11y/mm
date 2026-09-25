import availabilityMethods from './taskAvailabilityMethods';
import dialogMethods from './taskDialogMethods';

export const taskManagementMethods = {
  ...availabilityMethods,
  ...dialogMethods,
};
