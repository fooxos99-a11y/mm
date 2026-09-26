const LINE_TERMINATOR_PATTERN = /[\n\r\u2028\u2029]/;

const isAsciiDigit = (char) => char >= '0' && char <= '9';

const skipDigitsBackward = (text, position) => {
  let index = position;
  while (index > 0 && isAsciiDigit(text[index - 1])) index -= 1;
  return index;
};

/**
 * Splits a display value such as "1820+" or "95%" into [prefix, number, suffix],
 * where number is the last signed decimal in the text and suffix has no digits.
 * Returns null when the text has no number (or the prefix spans several lines).
 * Linear-time replacement for /^(.*?)([+-]?\d+(?:\.\d+)?)([^\d]*)$/.
 */
export const splitDisplayNumber = (value) => {
  const text = String(value);
  let end = text.length;
  while (end > 0 && !isAsciiDigit(text[end - 1])) end -= 1;
  if (end === 0) return null;

  let start = skipDigitsBackward(text, end);
  if (start >= 2 && text[start - 1] === '.' && isAsciiDigit(text[start - 2])) {
    start = skipDigitsBackward(text, start - 1);
  }
  if (start > 0 && (text[start - 1] === '+' || text[start - 1] === '-')) start -= 1;

  const prefix = text.slice(0, start);
  if (LINE_TERMINATOR_PATTERN.test(prefix)) return null;

  return [prefix, text.slice(start, end), text.slice(end)];
};
