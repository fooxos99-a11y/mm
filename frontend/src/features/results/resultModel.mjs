export const normalizeResultAnswer = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

export const formatScoreValue = value => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  const numeric = Number(value)
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1)
}

export const resolveStudentAnswer = answer => {
  if (!answer) return 'لا توجد إجابة'
  if (answer.fileName) return `ملف مرفق: ${answer.fileName}`
  return String(answer.value || '').trim() ? answer.value : 'لا توجد إجابة'
}

export const resolveCorrectAnswer = question => (
  String(question?.correctAnswer || '').trim() ? question.correctAnswer : 'لا توجد إجابة محددة'
)

export const requiresManualReview = (question, answer = null) => (
  typeof answer?.requiresManualReview === 'boolean'
    ? answer.requiresManualReview
    : question?.type === 'text'
  || !String(question?.correctAnswer || '').trim()
  || Boolean(answer?.fileName)
)

export const hasPendingManualReview = (questions, submission) => {
  if (!submission) return false
  const answerMap = new Map((submission.answers || []).map(answer => [answer.questionId, answer]))
  if ((questions || []).length) {
    return questions.some(question => {
      const answer = answerMap.get(question.id) || null
      return requiresManualReview(question, answer)
        && (answer?.manualPoints === null || answer?.manualPoints === undefined)
    })
  }
  return (submission.answers || []).some(answer => requiresManualReview(answer, answer)
    && (answer.manualPoints === null || answer.manualPoints === undefined))
}

export const calculateSubmissionScore = (questions, submission) => {
  if (!submission) return null
  if (submission.manualScore !== null && submission.manualScore !== undefined) return Number(submission.manualScore)
  if (!questions.length) return null

  const answerMap = new Map((submission.answers || []).map(answer => [answer.questionId, answer]))
  let pendingManualReview = false
  const score = questions.reduce((sum, question) => {
    const answer = answerMap.get(question.id) || null
    if (requiresManualReview(question, answer)) {
      if (answer?.manualPoints === null || answer?.manualPoints === undefined) {
        pendingManualReview = true
        return sum
      }
      return sum + Number(answer.manualPoints || 0)
    }
    if (answer?.awardedPoints !== null && answer?.awardedPoints !== undefined) {
      return sum + Number(answer.awardedPoints || 0)
    }
    const studentAnswer = resolveStudentAnswer(answer)
    return normalizeResultAnswer(studentAnswer) === normalizeResultAnswer(question.correctAnswer)
      ? sum + Number(question.points || 0)
      : sum
  }, 0)
  return pendingManualReview ? null : score
}

const resolveResultCorrectness = (answer, question, studentAnswer, correctAnswer) => {
  if (typeof answer?.isCorrect === 'boolean') return answer.isCorrect
  if (!question.correctAnswer) return null
  return normalizeResultAnswer(studentAnswer) === normalizeResultAnswer(correctAnswer)
}

const buildManualReviewStatus = (manualPoints, points) => {
  if (manualPoints === null || manualPoints === undefined) return 'بانتظار التصحيح اليدوي'
  return `تم التصحيح: ${formatScoreValue(manualPoints)} / ${formatScoreValue(points || 0)}`
}

const buildCorrectnessStatus = isCorrect => {
  if (isCorrect === null) return ''
  return isCorrect ? 'صحيحة' : 'غير صحيحة'
}

export const buildResultDetailCards = (questions, submission, {
  richTextAnswers = false,
  attachmentResolver = null,
} = {}) => {
  if (!submission) return []
  const answerMap = new Map((submission.answers || []).map(answer => [answer.questionId, answer]))
  const buildRichText = answer => richTextAnswers && !answer?.fileName && String(answer?.value || '').trim()
    ? String(answer.value)
    : ''
  const buildAttachment = answer => (attachmentResolver ? attachmentResolver(answer) : undefined)

  if (questions.length > 0) {
    return questions.map((question, index) => {
      const answer = answerMap.get(question.id) || null
      const studentAnswer = resolveStudentAnswer(answer)
      const correctAnswer = resolveCorrectAnswer(question)
      const manualReview = requiresManualReview(question, answer)
      const manualPoints = answer?.manualPoints ?? null
      const isCorrect = manualReview
        ? null
        : resolveResultCorrectness(answer, question, studentAnswer, correctAnswer)

      return {
        key: `${question.id}-${index}`,
        answerId: answer?.id || '',
        index: index + 1,
        prompt: question.prompt,
        points: question.points || 0,
        correctAnswer,
        hideCorrectAnswer: richTextAnswers || manualReview || !String(question.correctAnswer || '').trim(),
        studentAnswer,
        studentAnswerHtml: buildRichText(answer),
        ...(attachmentResolver ? { attachment: buildAttachment(answer) } : {}),
        requiresManualReview: manualReview,
        manualPoints,
        isCorrect,
        statusText: manualReview
          ? buildManualReviewStatus(manualPoints, question.points)
          : buildCorrectnessStatus(isCorrect),
      }
    })
  }

  return (submission.answers || []).map((answer, index) => {
    const manualReview = requiresManualReview(answer, answer)
    const manualPoints = answer.manualPoints ?? null
    return {
      key: `${answer.questionId || index}`,
      answerId: answer.id || '',
      index: index + 1,
      prompt: answer.prompt || `السؤال ${index + 1}`,
      points: answer.points || 0,
      correctAnswer: resolveCorrectAnswer(answer),
      hideCorrectAnswer: richTextAnswers || manualReview || !String(answer.correctAnswer || '').trim(),
      studentAnswer: resolveStudentAnswer(answer),
      studentAnswerHtml: buildRichText(answer),
      ...(attachmentResolver ? { attachment: buildAttachment(answer) } : {}),
      requiresManualReview: manualReview,
      manualPoints,
      isCorrect: null,
      statusText: manualReview ? buildManualReviewStatus(manualPoints, answer.points) : '',
    }
  })
}
