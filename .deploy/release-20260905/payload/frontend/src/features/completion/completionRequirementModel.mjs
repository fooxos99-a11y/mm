export const statusLabel = (status) => ({
  passed: 'مجتاز', in_progress: 'قيد الاستكمال', failed: 'غير مجتاز',
}[status] || status || 'قيد الاستكمال');

export const buildCompletionRequirements = (details) => {
  if (!details) return [];
  const ratio = (current, required) => (required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0);

  return [
    {
      key: 'attendance', label: 'الحضور', met: details.attendance.met,
      value: `${details.attendance.current} / ${details.attendance.required}`,
      progress: ratio(details.attendance.current, details.attendance.required),
      missing: `متبقٍ ${Math.max(0, details.attendance.required - details.attendance.current)} لقاء`,
    },
    {
      key: 'tasks', label: 'المهام المعتمدة', met: details.tasks.met,
      value: details.tasks.percentage === null ? '--' : `${details.tasks.percentage}%`,
      progress: details.tasks.percentage || 0,
      missing: details.tasks.total ? `المطلوب اعتماد ${details.tasks.requiredCount} من ${details.tasks.total}` : 'لا توجد مهام منشورة',
    },
    {
      key: 'final', label: 'الاختبار النهائي', met: details.finalExam.met,
      value: details.finalExam.percentage === null ? '--' : `${details.finalExam.percentage}%`,
      progress: details.finalExam.percentage || 0,
      missing: `المطلوب ${details.finalExam.requiredPercentage}% على الأقل`,
    },
    {
      key: 'quran', label: 'عرض القرآن', met: details.quran.met,
      value: `${details.quran.current} / ${details.quran.required}`,
      progress: ratio(details.quran.current, details.quran.required),
      missing: `متبقٍ ${Math.max(0, details.quran.required - details.quran.current)} جزء`,
    },
  ];
};
