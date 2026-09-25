export default {
  completionStatusLabel(status) {
    return status === 'passed' ? 'مجتاز' : 'غير مجتاز';
  },
  completionRequirementRows(details) {
    if (!details) return [];

    return [
      { label: 'الحضور', value: `${details.attendance?.current || 0} / ${details.attendance?.required || 0}` },
      { label: 'المهام', value: details.tasks?.percentage === null ? '--' : `${details.tasks?.percentage || 0}%` },
      { label: 'الاختبار النهائي', value: details.finalExam?.percentage === null ? '--' : `${details.finalExam?.percentage || 0}%` },
      { label: 'عرض القرآن', value: `${details.quran?.current || 0} / ${details.quran?.required || 0}` },
    ];
  },
  registrationProfileRows(profile) {
    if (!profile) return [];

    return [
      profile.loginCode ? { label: 'رقم الهوية', value: profile.loginCode } : null,
      profile.phone ? { label: 'رقم الجوال', value: profile.phone } : null,
      profile.gender ? { label: 'الجنس', value: profile.gender === 'female' ? 'أنثى' : 'ذكر' } : null,
      ...((profile.answers || []).filter((answer) => answer?.label)),
    ].filter(Boolean);
  },
  formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : '';
  },
  formatDateTime(value) {
    return value ? new Date(value).toLocaleString() : 'لا يوجد';
  },
  formatScore(value) {
    return value === null || value === undefined || value === '' ? 'لا يوجد' : Number(value);
  },
  buildArchivedStudentStats(detail) {
    const summary = detail?.summary || {};

    return [
      { key: 'pre', label: 'مرات الاختبار القبلي', value: Number(summary.preTests || 0) },
      { key: 'post', label: 'مرات الاختبار البعدي', value: Number(summary.postTests || 0) },
      { key: 'tasks', label: 'المهام المرسلة', value: Number(summary.tasks || 0) },
      { key: 'attendance', label: 'مرات التحضير', value: Number(summary.attendance || 0) },
    ];
  },
};
