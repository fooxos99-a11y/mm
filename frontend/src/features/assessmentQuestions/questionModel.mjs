export const createEmptyQuestionForm = ({ type = 'multiple', points = '1' } = {}) => ({
  prompt: '',
  type,
  options: type === 'multiple' ? ['', ''] : [],
  points: String(points),
  correctAnswer: '',
  correctAnswerTouched: false,
})

export const normalizeAssessmentAnswer = value => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/[.،,؛;!?؟:]+$/g, '')
  .replace(/^[أ-ي]\s*[).\-:]\s*/i, '')
  .trim()

export const createQuestionDraft = question => ({
  prompt: question?.prompt || '',
  type: question?.type === 'text' ? 'text' : 'multiple',
  options: question?.type === 'multiple'
    ? ((question?.options || []).length ? [...question.options] : ['', ''])
    : [],
  points: String(question?.points ?? 1),
  correctAnswer: question?.correctAnswer || '',
  correctAnswerTouched: Boolean(String(question?.correctAnswer || '').trim()),
})

export const validateQuestionDraft = (draft, { requireCorrectForTypes = ['multiple'] } = {}) => {
  const prompt = String(draft?.prompt || '').trim()
  const options = draft?.type === 'multiple'
    ? (draft.options || []).map(option => option.trim()).filter(Boolean)
    : []

  if (!prompt) return 'أدخل السؤال.'
  if (draft?.type === 'multiple' && options.length < 2) return 'أدخل خيارين على الأقل.'
  if (requireCorrectForTypes.includes(draft?.type) && !String(draft?.correctAnswer || '').trim()) return 'اختر الإجابة الصحيحة.'

  const points = Number(draft?.points)
  return Number.isFinite(points) && points >= 0 ? '' : 'أدخل درجة صحيحة.'
}

export const updateQuestionOption = (draft, optionIndex, value) => {
  const previousOption = draft.options[optionIndex] || ''
  const options = draft.options.map((option, index) => (index === optionIndex ? value : option))
  const sanitizedOptions = options.map(option => option.trim()).filter(Boolean)
  let correctAnswer = draft.correctAnswer

  if (normalizeAssessmentAnswer(previousOption) === normalizeAssessmentAnswer(draft.correctAnswer)) {
    correctAnswer = value.trim()
  } else if (!sanitizedOptions.some(option => normalizeAssessmentAnswer(option) === normalizeAssessmentAnswer(draft.correctAnswer))) {
    correctAnswer = ''
  }

  return { ...draft, options, correctAnswer }
}

export const applyPastedQuestionOptions = (draft, optionIndex, pastedOptions) => {
  const options = [...draft.options]

  while (options.length < optionIndex + pastedOptions.length) options.push('')
  pastedOptions.forEach((option, pastedIndex) => {
    options[optionIndex + pastedIndex] = option
  })

  const sanitizedOptions = options.map(option => option.trim()).filter(Boolean)
  const correctAnswer = sanitizedOptions.some(option => normalizeAssessmentAnswer(option) === normalizeAssessmentAnswer(draft.correctAnswer))
    ? draft.correctAnswer
    : ''

  return { ...draft, options, correctAnswer }
}

export const isCorrectQuestionOption = (draft, option) => {
  const normalizedOption = normalizeAssessmentAnswer(option)
  const normalizedAnswer = normalizeAssessmentAnswer(draft?.correctAnswer)
  return Boolean(draft?.correctAnswerTouched && normalizedOption && normalizedAnswer && normalizedOption === normalizedAnswer)
}

export const mapImportedQuestionToForm = (draft, defaultPoints, preferredType) => {
  const effectiveType = draft.type === 'multiple'
    ? 'multiple'
    : (preferredType === 'multiple' && draft.options.length >= 2 ? 'multiple' : 'text')

  return {
    ...createEmptyQuestionForm({ type: effectiveType, points: defaultPoints }),
    prompt: draft.prompt,
    options: effectiveType === 'multiple' ? (draft.options.length >= 2 ? [...draft.options] : ['', '']) : [],
  }
}
