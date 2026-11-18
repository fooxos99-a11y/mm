const responseTime = value => {
  const raw = String(value || '').trim();
  // Database timestamps are UTC; ISO timestamps already carry their own zone.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z` : raw;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
};

const ratingValue = value => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function buildSatisfactionRespondents({ courseId, responses = [], questions = [], students = [] }) {
  const questionMap = new Map(questions.filter(question => question.courseId === courseId)
    .map((question, index) => {
      const order = Number(question.sortOrder ?? index);
      return [question.id, { ...question, order: Number.isFinite(order) ? order : index }];
    }));
  const studentMap = new Map(students.filter(student => String(student.loginId || '').trim())
    .map(student => [String(student.loginId).trim(), student]));
  const respondents = new Map();
  for (const [index, response] of responses.entries()) {
    if (response.courseId !== courseId) continue;
    const loginCode = String(response.loginCode || '').trim();
    // Login codes distinguish people with identical names. Never merge unknown identities by name.
    const key = loginCode ? `login:${loginCode}` : `unknown:${response.id || index}`;
    const timestamp = responseTime(response.submittedAt);
    if (!respondents.has(key)) respondents.set(key, { key, loginCode, name: '', timestamp: null, answers: new Map() });
    const person = respondents.get(key);
    const currentName = String(studentMap.get(loginCode)?.name || '').trim();
    const name = currentName || String(response.studentName || '').trim();
    if (name && (!person.name || (timestamp !== null && (person.timestamp === null || timestamp >= person.timestamp)))) {
      person.name = name;
    }
    if (timestamp !== null && (person.timestamp === null || timestamp > person.timestamp)) person.timestamp = timestamp;
    const question = questionMap.get(response.questionId);
    const answerKey = response.questionId || response.id || `answer:${index}`;
    const previous = person.answers.get(answerKey);
    if (previous && (previous.timestamp ?? -Infinity) >= (timestamp ?? -Infinity)) continue;
    const rating = ratingValue(response.ratingValue);
    const text = String(response.textValue ?? '');
    person.answers.set(answerKey, {
      key: answerKey,
      prompt: String(response.questionPrompt || question?.prompt || 'سؤال سابق'),
      ratingValue: rating,
      textValue: text,
      answered: rating !== null || text.trim().length > 0,
      timestamp,
      order: question?.order ?? Number.MAX_SAFE_INTEGER,
    });
  }
  return [...respondents.values()].map(person => ({
    ...person,
    name: person.name || 'اسم غير متوفر',
    submittedAt: person.timestamp === null ? '' : new Date(person.timestamp).toISOString(),
    answers: [...person.answers.values()].sort((a, b) => a.order - b.order || a.prompt.localeCompare(b.prompt, 'ar')),
    answerCount: [...person.answers.values()].filter(answer => answer.answered).length,
  })).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0) || a.name.localeCompare(b.name, 'ar') || a.key.localeCompare(b.key));
}

const searchText = value => String(value || '').trim().toLocaleLowerCase('ar')
  .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));

export const filterSatisfactionRespondents = (respondents, query) => {
  const search = searchText(query);
  return search ? respondents.filter(person => searchText(person.name).includes(search)
    || searchText(person.loginCode).includes(search)) : respondents;
};
