export const scopeCourseUpdates = (updates, role) => {
  const branch = { male_manager: 'male', female_manager: 'female' }[role];
  if (!branch) return updates;
  const result = { ...updates };
  for (const key of ['branchAvailability', 'assessmentWindows']) {
    if (updates[key]) result[key] = { [branch]: { ...updates[key][branch] } };
  }
  return result;
};
