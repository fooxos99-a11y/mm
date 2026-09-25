const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const escapeCsvCell = (value) => {
  const text = String(value ?? '');
  const safeText = FORMULA_PREFIX.test(text) ? `'${text}` : text;

  return `"${safeText.replace(/"/g, '""')}"`;
};

export const buildCsv = (rows) => rows
  .map((row) => row.map(escapeCsvCell).join(','))
  .join('\r\n');
