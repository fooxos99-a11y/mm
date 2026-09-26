export const PRACTITIONER_NAV_LINKS = ['#about', '#competencies', '#requirements'];
export const PRACTITIONER_PROGRAM_INDICATORS = [
  { key: 'memorization', label: 'مجموع الأجزاء المقروءة', display: '1820+', progress: 100 },
  { key: 'attendance', label: 'الحضور', display: '95%', progress: 95 },
  { key: 'assessments', label: 'اختبار قبلي وبعدي', display: '1920+', progress: 100 },
  { key: 'courses', label: 'دورة', display: '24', progress: 100 },
  { key: 'tasks', label: 'المهام الأدائية', display: '630+', progress: 100 },
  { key: 'completed30', label: 'عدد خريجي هذه الدفعة معلم ومعلمة', display: '110', progress: 100 },
];
export const easeOutCubic = (value) => 1 - ((1 - value) ** 3);
