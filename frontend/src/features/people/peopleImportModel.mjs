const cellText = value => {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || '').join('').trim();
    if (value.text !== undefined) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
  }
  return String(value ?? '').trim();
};

const labelText = value => cellText(value).replace(/ـ/g, '').replace(/[\s\u00a0]+/g, ' ').replace(/[\s:/]+$/g, '').trim();

export function prepareStudentImport(rawRows, startCode = '0700') {
  const rows = rawRows.map((row, index) => ({
    sourceRow: row.sourceRow || index + 1,
    cells: (row.cells || row).map(cellText),
  })).filter(row => row.cells.some(Boolean));
  if (!rows.length) throw new Error('الملف فارغ.');
  const headers = rows[0].cells.map(labelText);
  const registrationIndex = headers.findIndex(label => label === 'الاسم الرباعي');
  const nameIndex = registrationIndex >= 0 ? registrationIndex : headers.findIndex(label =>
    ['الاسم', 'اسم المعلم', 'اسم المقرئ', 'name', 'full name', 'student name'].includes(label.toLowerCase()));
  const loginIndex = headers.findIndex(label => ['رقم الدخول', 'login', 'login code', 'code'].includes(label.toLowerCase()));
  const passwordIndex = headers.findIndex(label => ['كلمة المرور', 'password', 'initial password'].includes(label.toLowerCase()));
  const hasHeader = nameIndex >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (!dataRows.length) throw new Error('لا توجد أسماء في الملف.');
  if (!/^\d{4,}$/.test(startCode)) throw new Error('أدخل رقم بداية من أربعة أرقام على الأقل.');
  return dataRows.map((row, index) => {
    const name = row.cells[hasHeader ? nameIndex : 0];
    if (!name) throw new Error(`الاسم مفقود في الصف ${row.sourceRow}.`);
    const loginCode = loginIndex >= 0 ? row.cells[loginIndex]
      : (!hasHeader && row.cells[1]) || String(Number(startCode) + index).padStart(startCode.length, '0');
    const password = passwordIndex >= 0 ? row.cells[passwordIndex] : (!hasHeader && row.cells[2]) || loginCode;
    if (!loginCode || !password) throw new Error(`أكمل بيانات الدخول في الصف ${row.sourceRow}.`);
    const sourceFields = registrationIndex >= 0 ? headers.map((label, column) => ({
      label: label || `العمود ${column + 1}`, value: row.cells[column] || '',
    })) : [];
    return { name, loginCode, password, sourceRow: row.sourceRow, sourceFields };
  });
}

export function parseImportCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell); cell = '';
      if (char !== ',') { rows.push(row); row = []; if (char === '\r' && text[i + 1] === '\n') i++; }
    } else cell += char;
  }
  if (quoted) throw new Error('تنسيق CSV غير مكتمل.');
  row.push(cell); rows.push(row);
  return rows;
}
