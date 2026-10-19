export const archiveCountFields = Object.freeze([
  { key: 'courses_count', label: 'عدد الدورات' },
  { key: 'tasks_count', label: 'عدد المهام الأدائية' },
  { key: 'male_teachers_count', label: 'عدد المعلمين' },
  { key: 'female_teachers_count', label: 'عدد المعلمات' },
  { key: 'completed_parts_count', label: 'الأجزاء المقروءة' },
]);

export const emptyArchiveCounts = () => Object.fromEntries(archiveCountFields.map(({ key }) => [key, 0]));

export function archiveCountError(value) {
  const count = Number(value);
  return value === '' || value === null || value === undefined || !Number.isSafeInteger(count) || count < 0 || count > 1000000
    ? 'أدخل عددًا صحيحًا من 0 إلى 1000000.'
    : '';
}

export const archiveCountErrors = (counts) => Object.fromEntries(
  archiveCountFields.map(({ key }) => [key, archiveCountError(counts[key])]).filter(([, error]) => error),
);
