export const acknowledgeSubmission = (snapshot, collection, result, payload) => ({
  ...snapshot,
  [collection]: [
    ...(snapshot?.[collection] || []).filter(item => item.id !== result.id),
    { ...payload, ...result },
  ],
});

export const hasQuestionAnswer = (question, answers, files) => Boolean(
  String(answers[question.id] || '').trim()
  || (question.type === 'text' && question.allowFile && files[question.id]?.file),
);

export const recoverSavedSubmission = async (fetchSnapshot, isSaved) => {
  try {
    const snapshot = await fetchSnapshot();
    return isSaved(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
};
