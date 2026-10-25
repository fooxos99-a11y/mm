export const MAX_TRAINING_FILE_BYTES = 100 * 1024 * 1024;

export const validateTrainingAttachmentSizes = (attachments) => {
  const oversized = attachments.find(({ file }) => file?.size > MAX_TRAINING_FILE_BYTES);
  return oversized
    ? `حجم الملف «${oversized.file.name}» يتجاوز 100 ميجابايت. اختر ملفًا أصغر.`
    : '';
};

export const resolveTrainingUploadError = (error) => {
  const status = error?.response?.status;
  if (status === 413) return 'حجم المرفقات مجتمعة يتجاوز حد استقبال الطلب في الخادم. قلّل عدد الملفات أو أحجامها.';
  if (status === 401) return 'انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة.';
  if (status === 403) return 'ليس لديك صلاحية حفظ المادة التدريبية.';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'انتهت مهلة رفع المرفقات. تحقق من الاتصال ثم أعد المحاولة.';
  }
  if (!error?.response) return 'تعذر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.';
  if (status >= 500) return 'حدث خطأ في الخادم أثناء حفظ المادة التدريبية. أعد المحاولة أو تواصل مع الدعم.';

  const errors = error.response.data?.errors;
  const messages = errors && typeof errors === 'object' ? Object.values(errors).flat() : [];
  const message = messages.find(Boolean) || error.response.data?.message;
  // Older servers may still send Laravel's English upload errors.
  if (/failed to upload/i.test(String(message))) {
    return 'فشل استقبال الملف، ولم يحدد الخادم السبب. أعد المحاولة أو تواصل مع الدعم.';
  }
  return typeof message === 'string' && /[\u0600-\u06ff]/u.test(message)
    ? message
    : 'تعذر حفظ المادة التدريبية، ولم يحدد الخادم السبب. أعد المحاولة أو تواصل مع الدعم.';
};
