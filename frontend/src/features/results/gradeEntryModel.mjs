import { calculateSubmissionScore, formatResultScore } from './resultModel.mjs'

export const buildGradeRows = (snapshot, courseId, type) => {
  const course = snapshot.courses.find(item => item.id === courseId)
  const questions = (type === 'pre' ? course?.preQuestions : course?.postQuestions) || []
  const submissions = new Map(snapshot.submissions.map(item => [item.loginId, item]))
  const entries = new Map((snapshot.scoreEntries || []).map(item => [item.studentId, item]))
  return snapshot.students.map(student => {
    const submission = submissions.get(student.loginId) || null
    const score = calculateSubmissionScore(questions, submission)
    return {
      id: student.id, name: student.name, loginId: student.loginId,
      initialScore: score, value: score === null ? '' : String(score), clear: false,
      manual: submission?.manualScore !== null && submission?.manualScore !== undefined,
      version: entries.get(student.id)?.version || null,
      currentLabel: formatResultScore(questions, submission, score),
    }
  })
}

export const gradeChanges = rows => rows.flatMap(row => {
  if (row.clear) return [{ studentId: row.id, score: null, expectedVersion: row.version }]
  if (String(row.value).trim() === '') return []
  const score = Number(row.value)
  return score === row.initialScore ? [] : [{ studentId: row.id, score, expectedVersion: row.version }]
})

export const validateGradeDraft = (rows, totalValue) => {
  const total = Number(totalValue)
  const errors = {}
  if (!Number.isFinite(total) || total <= 0 || total > 1000000 || !/^\d+(\.\d{1,2})?$/.test(String(totalValue))) {
    errors.totalPoints = 'أدخل درجة الاختبار.'
  }
  for (const row of rows) {
    if (row.clear || String(row.value).trim() === '') continue
    const score = Number(row.value)
    if (!Number.isFinite(score) || score < 0 || !/^\d+(\.\d{1,2})?$/.test(String(row.value))) {
      errors[row.id] = `أدخل درجة من 0 إلى ${Number.isFinite(total) && total > 0 ? total : 'الدرجة الكاملة'}.`
    } else if (score > total) {
      errors[row.id] = 'يجب أن تساوي درجة الاختبار درجة الطالب أو تزيد عليها.'
    }
  }
  return errors
}
