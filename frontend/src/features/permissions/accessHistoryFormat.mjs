export const accessDate = value => value ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value)) : 'غير مسجّل';

export const accessValue = value => {
  if (value === true) return 'مفعّل';
  if (value === false) return 'معطّل';
  return ({ male_manager: 'مشرف المعلمين', female_manager: 'مشرفة المعلمات', admin: 'مسؤول الإدارة' })[value] ?? String(value ?? '');
};
