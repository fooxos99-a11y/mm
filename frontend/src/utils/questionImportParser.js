const QUESTION_LINE_PATTERN = /[؟?؛:.]\s*$/;
const NUMBER_TOKEN = '0-9\u0660-\u0669\u06F0-\u06F9';
const OPTION_LETTER_TOKEN = 'A-Da-d\u0623\u0628\u062C\u062F\u0627';
const QUESTION_START_PATTERN = new RegExp(String.raw`^\s*[${NUMBER_TOKEN}]{1,3}\s*[).:؛/-]?\s+`);
const QUESTION_END_NUMBER_PATTERN = new RegExp(String.raw`\s*[).:؛/-]?\s*[${NUMBER_TOKEN}]{1,3}\s*$`);
const LEADING_LIST_MARKER_PATTERN = new RegExp(String.raw`^\s*(?:\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[-–—.)(:/؛]\s*|\(?[${NUMBER_TOKEN}]{1,3}\)?\s+|(?:\([${OPTION_LETTER_TOKEN}]\)|[${OPTION_LETTER_TOKEN}]\s*[-–—.)(:/؛])\s*)`);
const OPTION_MARKER_PATTERN = new RegExp(String.raw`^\s*(?:[-*•●▪◦]|\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[)(.:؛/-]|\([${OPTION_LETTER_TOKEN}]\)|[${OPTION_LETTER_TOKEN}]\s*[)(.:؛/-])\s*`);
const TRAILING_OPTION_MARKER_PATTERN = new RegExp(String.raw`\s*(?:\([${OPTION_LETTER_TOKEN}]\)|\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[)(.:؛/-])\s*$`);
const OPTION_MARKER_ANYWHERE_PATTERN = new RegExp(String.raw`(?:\([${OPTION_LETTER_TOKEN}]\)|[${OPTION_LETTER_TOKEN}]\s*[)(.:؛/-]|\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[)(.:؛/-])`);
const INLINE_OPTION_SPLIT_PATTERN = new RegExp(String.raw`\s+(?=(?:\([${OPTION_LETTER_TOKEN}]\)|[${OPTION_LETTER_TOKEN}]\s*[)(.:؛/-]|\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[)(.:؛/-]))`, 'g');
const ANSWER_LINE_PATTERNS = [
  /^الإجابة(?:\s+الصحيحة)?\s*[:：-]/i,
  /^الجواب(?:\s+الصحيح)?\s*[:：-]/i,
  /^(?:correct\s*)?answer\s*[:：-]/i,
  /^(?:solution|الدرجة|التعليل|التفسير)\s*[:：-]/i,
];
const INSTRUCTION_LINE_PATTERN = /^(?:التعليمات|إرشادات|ملاحظات|instructions?)\s*[:：-]/i;
const NOISE_LINE_PATTERN = /^(?:page\s*\d+|\d+\s*\/\s*\d+|\d+)$/i;
const NUMBERED_MARKER_PATTERN = new RegExp(String.raw`^\s*\(?[${NUMBER_TOKEN}]{1,3}\)?\s*[)(.:؛/-]`);

const normalizeLine = (value) => String(value || '')
  .replaceAll('\u00a0', ' ')
  .replace(/\s+/g, ' ')
  // Whitespace runs are already collapsed to one space above, so a single space is enough here.
  .replaceAll(/ ([؟?؛:.,])/g, '$1')
  .replace(/([.،؛:?؟])\1+/g, '$1')
  .replace(/^[-–—•●▪◦.،؛:]+\s*/, '')
  .trim();

const stripLeadingMarker = (value) => normalizeLine(String(value || '').replace(LEADING_LIST_MARKER_PATTERN, ''));
const stripTrailingQuestionNumber = (value) => normalizeLine(String(value || '').replace(QUESTION_END_NUMBER_PATTERN, ''));
const stripOptionMarker = (value) => normalizeLine(String(value || '').replace(OPTION_MARKER_PATTERN, '').replace(TRAILING_OPTION_MARKER_PATTERN, ''));
const isQuestionLine = (value) => QUESTION_LINE_PATTERN.test(normalizeLine(value));

const isQuestionStartLine = (value) => {
  const normalized = normalizeLine(value);

  if (!normalized) {
    return false;
  }

  return QUESTION_START_PATTERN.test(normalized) || QUESTION_END_NUMBER_PATTERN.test(normalized);
};

const isOptionLine = (value) => {
  const normalized = normalizeLine(value);

  if (!normalized) {
    return false;
  }

  return OPTION_MARKER_PATTERN.test(normalized) || TRAILING_OPTION_MARKER_PATTERN.test(normalized);
};

const shouldIgnoreLine = (value) => {
  const normalized = normalizeLine(value);
  return !normalized || NOISE_LINE_PATTERN.test(normalized)
    || ANSWER_LINE_PATTERNS.some((pattern) => pattern.test(normalized)) || INSTRUCTION_LINE_PATTERN.test(normalized);
};

const isExplicitQuestionBoundary = (lines, index) => {
  const line = lines[index];

  if (!isQuestionStartLine(line)) {
    return false;
  }

  const normalizedPrompt = stripTrailingQuestionNumber(stripLeadingMarker(line));

  if (isQuestionLine(normalizedPrompt)) {
    return true;
  }

  if (!NUMBERED_MARKER_PATTERN.test(normalizeLine(line))) {
    return false;
  }

  for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
    const nextLine = lines[nextIndex];

    if (shouldIgnoreLine(nextLine)) {
      continue;
    }

    return isOptionLine(nextLine) && !NUMBERED_MARKER_PATTERN.test(normalizeLine(nextLine));
  }

  return true;
};

const splitInlineOptions = (value) => {
  const normalized = normalizeLine(value);
  const firstMarkerIndex = normalized.search(OPTION_MARKER_ANYWHERE_PATTERN);

  if (firstMarkerIndex <= 0) {
    return { prompt: normalized, options: [] };
  }

  const prompt = normalizeLine(normalized.slice(0, firstMarkerIndex));
  const inlineOptionsSource = normalizeLine(normalized.slice(firstMarkerIndex));

  if (!prompt || !inlineOptionsSource) {
    return { prompt: normalized, options: [] };
  }

  const options = inlineOptionsSource
    .split(INLINE_OPTION_SPLIT_PATTERN)
    .map(stripOptionMarker)
    .filter(Boolean);

  if (options.length < 2) {
    return { prompt: normalized, options: [] };
  }

  return { prompt, options };
};

const collectQuestionParts = (rawLines, index) => {
  const questionParts = [stripTrailingQuestionNumber(stripLeadingMarker(rawLines[index]))];
  let cursor = index + 1;

  if (isQuestionLine(questionParts[0])) {
    return { questionParts, cursor };
  }

  while (cursor < rawLines.length) {
    const nextLine = rawLines[cursor];

    if (!nextLine) {
      cursor += 1;
      continue;
    }

    if (isExplicitQuestionBoundary(rawLines, cursor) || isOptionLine(nextLine)) {
      break;
    }

    questionParts.push(stripTrailingQuestionNumber(nextLine));
    cursor += 1;

    if (isQuestionLine(nextLine)) {
      break;
    }
  }

  return { questionParts, cursor };
};

const endsOptionScan = (candidate, markedOptions) => (
  isQuestionStartLine(candidate) || isQuestionLine(candidate) || markedOptions.length > 0
);

const collectMarkedOptions = (rawLines, startCursor, inlineOptions) => {
  const markedOptions = [...inlineOptions];
  let cursor = startCursor;

  while (cursor < rawLines.length) {
    const candidate = rawLines[cursor];

    if (shouldIgnoreLine(candidate)) {
      cursor += 1;
      continue;
    }

    if (isExplicitQuestionBoundary(rawLines, cursor)) {
      break;
    }

    if (isOptionLine(candidate)) {
      markedOptions.push(stripOptionMarker(candidate));
      cursor += 1;
      continue;
    }

    if (endsOptionScan(candidate, markedOptions)) {
      break;
    }

    cursor += 1;
  }

  return { markedOptions, cursor };
};

const isQuestionCandidateLine = (line) => (
  !shouldIgnoreLine(line) && (isQuestionStartLine(line) || isQuestionLine(line))
);

const parseQuestionAt = (rawLines, index) => {
  const skipLine = { question: null, nextIndex: index + 1 };

  if (!isQuestionCandidateLine(rawLines[index])) {
    return skipLine;
  }

  const { questionParts, cursor: promptEnd } = collectQuestionParts(rawLines, index);
  const inlineSplit = splitInlineOptions(questionParts.join(' ').trim());
  const resolvedPrompt = inlineSplit.prompt;

  if (!resolvedPrompt) {
    return skipLine;
  }

  const { markedOptions, cursor } = collectMarkedOptions(rawLines, promptEnd, inlineSplit.options);

  if (!isQuestionLine(resolvedPrompt) && markedOptions.length === 0) {
    return skipLine;
  }

  return {
    question: {
      prompt: resolvedPrompt,
      type: markedOptions.length >= 2 ? 'multiple' : 'text',
      options: markedOptions.filter((option, optionIndex, collection) => collection.indexOf(option) === optionIndex),
    },
    nextIndex: cursor,
  };
};

export const parseImportedQuestionsFromText = (text) => {
  const rawLines = String(text || '')
    .replaceAll(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizeLine);

  const importedQuestions = [];
  let index = 0;

  while (index < rawLines.length) {
    const { question, nextIndex } = parseQuestionAt(rawLines, index);

    if (question) {
      importedQuestions.push(question);
    }

    index = nextIndex;
  }

  return importedQuestions.filter((question, questionIndex, collection) => collection.findIndex((candidate) => candidate.prompt === question.prompt) === questionIndex);
};

export const stripQuestionOptionLabel = (value) => String(value || '')
  .trim()
  .replace(/^(?:[A-Za-z\u0621-\u064A]|\d{1,2})\s*[-–—.):]\s*/, '')
  .trim();

export const splitPastedQuestionOptions = (value) => {
  const normalizedValue = String(value || '').replace(/\r\n?/g, '\n').trim();

  if (!normalizedValue) {
    return [];
  }

  const markerPattern = /(^|\s)(?:[A-Za-z\u0621-\u064A]|\d{1,2})\s*[-–—.):]/gm;
  const markers = [];
  let match;

  while ((match = markerPattern.exec(normalizedValue)) !== null) {
    markers.push({ labelStart: match.index + match[1].length });
  }

  if (markers.length < 2) {
    return [];
  }

  return markers
    .map((marker, markerIndex) => {
      const nextMarkerStart = markers[markerIndex + 1]?.labelStart ?? normalizedValue.length;
      return stripQuestionOptionLabel(normalizedValue.slice(marker.labelStart, nextMarkerStart));
    })
    .filter(Boolean);
};
