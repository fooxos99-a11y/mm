export function previousAttendanceRecords(records, students, courseId, sessionId) {
  if (!courseId || !sessionId) return [];
  const branchStudents = new Map(students.map(student => [student.loginId, student]));
  return records.filter(record => record.courseId === courseId && record.sessionId !== sessionId
    && branchStudents.has(record.loginId))
    .map(record => ({ ...record, studentName: branchStudents.get(record.loginId).name }))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
      || left.studentName.localeCompare(right.studentName, 'ar'));
}
