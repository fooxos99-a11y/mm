export const PERMISSION_GROUPS = [
  {
    label: 'صفحات القائمة الجانبية',
    permissions: [
      ['page_overview', 'الرئيسية'], ['page_courses', 'الدورات'], ['page_tasks', 'المهام الأدائية'],
      ['page_final_exam', 'الاختبار النهائي'], ['page_satisfaction', 'استبيان الرضا'],
      ['page_users', 'المستخدمون'], ['page_notifications', 'الإشعارات'],
      ['page_materials', 'المواد التدريبية'], ['page_results', 'النتائج'],
      ['page_completion_requirements', 'متطلبات الاجتياز'], ['page_archive', 'الأرشيف'],
      ['page_registration', 'التسجيل'],
    ],
  },
  {
    label: 'متطلبات الاجتياز',
    permissions: [
      ['edit_completion_requirements', 'تعديل قيم المتطلبات'],
      ['close_completion_results', 'إغلاق النتائج وإعادة فتحها'],
    ],
  },
  {
    label: 'الطلاب',
    permissions: [['add_student', 'إضافة طالب'], ['delete_student', 'حذف طالب'], ['edit_student', 'تعديل بيانات طالب']],
  },
  {
    label: 'الاختبارات',
    permissions: [
      ['edit_pre_questions', 'تعديل أسئلة الاختبار القبلي'],
      ['edit_post_questions', 'تعديل أسئلة الاختبار البعدي'],
      ['edit_tasks', 'تعديل المهام الأدائية'], ['open_pre_exam', 'فتح الاختبار القبلي'],
      ['open_post_exam', 'فتح الاختبار البعدي'],
    ],
  },
  {
    label: 'الإقراء',
    permissions: [
      ['add_reciter', 'إضافة مقرئ'], ['delete_reciter', 'حذف مقرئ'],
      ['edit_reciter', 'تعديل بيانات مقرئ'], ['transfer_reciter_student', 'نقل الطالب المرتبط بمقرئ'],
    ],
  },
].map((group) => ({
  ...group,
  permissions: group.permissions.map(([key, label]) => ({ key, label })),
}));

export const PERMISSION_ROLES = [
  { value: 'male_manager', label: 'مشرف المعلمين' },
  { value: 'female_manager', label: 'مشرفة المعلمات' },
];
