export const ACCOUNT_PASSWORD_HINT = '8 أحرف على الأقل، وبحد أقصى 255 حرفًا.';
export const accountEditorErrors = (form, editing = false) => {
  const errors = {};
  if (String(form.name || '').trim().length < 6) errors.name = 'أدخل اسمًا من 6 أحرف على الأقل.';
  else if (String(form.name).trim().length > 255) errors.name = 'استخدم 255 حرفًا أو أقل.';
  if (!String(form.loginCode || '').trim()) errors.loginCode = 'أدخل رقم الدخول.';
  else if (String(form.loginCode).trim().length > 255) errors.loginCode = 'استخدم 255 حرفًا أو أقل.';
  const length = [...String(form.password || '')].length;
  if ((!editing || length) && (length < 8 || length > 255 || !String(form.password).trim())) errors.password = ACCOUNT_PASSWORD_HINT;
  if (!['admin', 'male_manager', 'female_manager'].includes(form.role)) errors.role = 'اختر نوع المسؤول.';
  return errors;
};
export const accountEditorChanged = (form, baseline) => ['name', 'loginCode', 'role', 'isActive']
  .some(key => form[key] !== baseline[key]) || Boolean(form.password);
