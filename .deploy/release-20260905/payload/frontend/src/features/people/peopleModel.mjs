export const BULK_NAME_HEADER_KEYS = Object.freeze([
  'name', 'full name', 'student name', 'reciter name', 'الاسم', 'اسم', 'اسم المعلم', 'اسم المقرئ',
])
export const BULK_LOGIN_HEADER_KEYS = Object.freeze([
  'login', 'login code', 'code', 'id', 'number', 'رقم الدخول', 'رقم', 'الرقم',
])
export const BULK_PASSWORD_HEADER_KEYS = Object.freeze(['password', 'initial password', 'كلمة المرور'])

export const createEmptyStudentForm = () => ({
  name: '',
  loginId: '',
  password: '',
  passwordConfirmation: '',
  branchId: 'male',
  note: '',
})

export const createEmptyReciterForm = () => ({
  name: '',
  loginCode: '',
  password: '',
  passwordConfirmation: '',
  branchId: 'male',
  studentIds: [],
})

export const clampPercent = value => {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 0
}

export const ratioPercent = (value, total) => (total ? clampPercent((value / total) * 100) : 0)
