export const createEmptyQuestionForm = ({ type = 'multiple', points = '1' } = {}) => ({
  prompt: '',
  type,
  options: type === 'multiple' ? ['', ''] : [],
  points: String(points),
  correctAnswer: '',
  correctAnswerTouched: false,
})

const TRAILING_ANSWER_PUNCTUATION = new Set(['.', '،', ',', '؛', ';', '!', '?', '؟', ':'])

const stripTrailingPunctuation = text => {
  let end = text.length
  while (end > 0 && TRAILING_ANSWER_PUNCTUATION.has(text[end - 1])) end -= 1
  return text.slice(0, end)
}

const foldArabicLetters = value => String(value || '')
  .trim()
  .toLowerCase()
  .replaceAll(/[\u064B-\u065F\u0670]/g, '')
  .replaceAll(/[أإآ]/g, 'ا')
  .replaceAll('ة', 'ه')
  .replaceAll('ى', 'ي')

export const normalizeAssessmentAnswer = value => stripTrailingPunctuation(foldArabicLetters(value))
  .replace(/^[أ-ي]\s*[).\-:]\s*/i, '')
  .trim()

const createDraftOptions = question => {
  if (question?.type !== 'multiple') return []
  return (question?.options || []).length ? [...question.options] : ['', '']
}

export const createQuestionDraft = question => ({
  prompt: question?.prompt || '',
  type: question?.type === 'text' ? 'text' : 'multiple',
  options: createDraftOptions(question),
  points: String(question?.points ?? 1),
  correctAnswer: question?.correctAnswer || '',
  correctAnswerTouched: Boolean(String(question?.correctAnswer || '').trim()),
})

export const hasQuestionDraftChanges = (question, draft) => {
  const normalize = value => ({
    prompt: String(value.prompt || '').trim(),
    type: value.type,
    options: value.type === 'multiple' ? (value.options || []).map(option => option.trim()).filter(Boolean) : [],
    points: Number(value.points ?? 1),
    correctAnswer: value.type === 'multiple' ? String(value.correctAnswer || '').trim() : '',
  })
  return JSON.stringify(normalize(createQuestionDraft(question))) !== JSON.stringify(normalize(draft))
}

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
  const hasEnoughOptions = draft.options.length >= 2
  const effectiveType = draft.type === 'multiple' || (preferredType === 'multiple' && hasEnoughOptions)
    ? 'multiple'
    : 'text'
  let options = []
  if (effectiveType === 'multiple') options = hasEnoughOptions ? [...draft.options] : ['', '']

  return {
    ...createEmptyQuestionForm({ type: effectiveType, points: defaultPoints }),
    prompt: draft.prompt,
    options,
  }
}
