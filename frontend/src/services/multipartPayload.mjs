const appendValue = (formData, key, value) => {
  if (value !== undefined && value !== null) {
    formData.append(key, String(value));
  }
};

export const buildAssessmentSubmissionFormData = (payload, identityFields) => {
  const formData = new FormData();

  identityFields.forEach((field) => appendValue(formData, field, payload[field]));
  (payload.answers || []).forEach((answer, index) => {
    const prefix = `answers[${index}]`;

    appendValue(formData, `${prefix}[questionId]`, answer.questionId);
    appendValue(formData, `${prefix}[value]`, answer.value || '');
    appendValue(formData, `${prefix}[fileName]`, answer.fileName);
    appendValue(formData, `${prefix}[fileType]`, answer.fileType);

    if (typeof File !== 'undefined' && answer.file instanceof File) {
      formData.append(`${prefix}[file]`, answer.file, answer.fileName || answer.file.name);
    } else {
      appendValue(formData, `${prefix}[fileDataUrl]`, answer.fileDataUrl);
    }
  });

  return formData;
};

export const multipartRequestConfig = Object.freeze({
  headers: { 'Content-Type': 'multipart/form-data' },
});
