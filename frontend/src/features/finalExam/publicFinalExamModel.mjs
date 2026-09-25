export const MAX_FINAL_EXAM_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export const normalizeFinalExamAnswer = (value) => String(value || '').trim().toLowerCase();

export const finalExamAnswersMatch = (correctAnswer, answer) => (
  Boolean(String(correctAnswer || '').trim())
  && normalizeFinalExamAnswer(answer) === normalizeFinalExamAnswer(correctAnswer)
);

export const resolveFinalExamStudent = (students, loginId) => (
  (students || []).find((student) => student.loginId === loginId) || null
);

export const resolveFinalExamQuestions = (questions, branchCode) => (
  [...(questions || [])]
    .filter((question) => question.branchCode === branchCode)
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
);

export const isFinalExamAvailable = (student, setting, timestamp = Date.now()) => {
  if (!student || !setting?.isEnabled) return false;
  if (!setting.closesAt) return true;

  const closesAt = new Date(setting.closesAt).getTime();
  return Number.isFinite(closesAt) && closesAt > timestamp;
};

export const resolveFinalExamSubmission = (submissions, loginId) => (
  (submissions || []).find((submission) => submission.loginCode === loginId) || null
);

export const submittedFinalExamAnswer = (submission, questionId) => (
  (submission?.answers || []).find((answer) => answer.questionId === questionId)?.value || ''
);

export const gradeFinalExamSubmission = (questions, submission) => {
  const total = (questions || []).reduce((sum, question) => sum + Number(question.points || 0), 0);
  if (!submission) return { score: 0, total };

  if (typeof submission.manualScore === 'number' && Number.isFinite(submission.manualScore)) {
    return { score: submission.manualScore, total: Math.max(total, submission.manualScore) };
  }

  const score = (questions || []).reduce((sum, question) => {
    if (!question.correctAnswer) return sum;
    return finalExamAnswersMatch(question.correctAnswer, submittedFinalExamAnswer(submission, question.id))
      ? sum + Number(question.points || 0)
      : sum;
  }, 0);

  return { score, total };
};

export const resolveFinalExamPreviewKind = (attachment) => {
  const type = attachment?.type || '';
  const dataUrl = attachment?.dataUrl || '';

  if (type.startsWith('image/') || dataUrl.startsWith('data:image/')) return 'image';
  if (type === 'application/pdf' || dataUrl.startsWith('data:application/pdf')) return 'pdf';
  if (type.startsWith('video/') || dataUrl.startsWith('data:video/')) return 'video';
  return 'other';
};

export const finalExamReviewPresentation = (question, submission) => {
  const answer = submittedFinalExamAnswer(submission, question.id);
  if (!question.correctAnswer) {
    return { modifier: 'neutral', label: 'تم استلام الإجابة.' };
  }
  if (finalExamAnswersMatch(question.correctAnswer, answer)) {
    return { modifier: 'success', label: 'إجابة صحيحة' };
  }
  return { modifier: 'danger', label: `الإجابة الصحيحة: ${question.correctAnswer}` };
};
