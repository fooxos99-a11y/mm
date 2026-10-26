// Each page owns its resources, as in a normal exported training document.
export function trainingPdfFixture(count = 24) {
  const objects = [];
  const image = Buffer.alloc(120000);
  for (let i = 0; i < image.length; i++) image[i] = i % 255;
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Count ${count} /Kids [${Array.from({ length: count }, (_, i) => `${4 + i} 0 R`).join(' ')}] >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (let i = 0; i < count; i++) {
    const contentId = 4 + count + i * 2;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << /Im ${contentId + 1} 0 R >> >> /Contents ${contentId} 0 R >>`);
  }
  for (let i = 0; i < count; i++) {
    const content = `BT /F1 20 Tf 50 790 Td (Training page ${i + 1}) Tj ET q 440 0 0 440 50 250 cm /Im Do Q`;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 200 /Height 200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${image.length} >>\nstream\n`), image, Buffer.from('\nendstream')]));
  }
  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  let size = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(size);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.from(object), Buffer.from('\nendobj\n')]);
    chunks.push(chunk); size += chunk.length;
  });
  chunks.push(Buffer.from(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));
  return Buffer.concat(chunks);
}
