import { DOCUMENT_PDF_LAYOUT, documentPageSlices } from '../utils/documentPdfLayout.mjs';

const checkAborted = signal => {
  if (signal?.aborted) throw new DOMException('Preview closed', 'AbortError');
};

async function prepareImages(element, signal) {
  await Promise.all([...element.querySelectorAll('img')].map(async image => {
    if (!image.src.startsWith('data:')) {
      const response = await fetch(image.src, { credentials: 'same-origin', signal });
      if (!response.ok) throw new Error('Document image unavailable');
      const blob = await response.blob();
      image.src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    await image.decode();
  }));
}

function documentBlocks(element) {
  const offset = element.getBoundingClientRect().top;
  const blocks = [...element.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,tr,img')]
    .map(node => node.getBoundingClientRect());
  // Individual line boxes also protect long paragraphs and table cells from cuts.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    blocks.push(...range.getClientRects());
  }
  return blocks.map(rect => ({ top: rect.top - offset, bottom: rect.bottom - offset }));
}

export async function createDocumentAnswerPdf(element, { signal } = {}) {
  checkAborted(signal);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  checkAborted(signal);
  await document.fonts.ready;
  await prepareImages(element, signal);
  checkAborted(signal);
  const layout = DOCUMENT_PDF_LAYOUT;
  const slices = documentPageSlices(Math.ceil(element.getBoundingClientRect().height), documentBlocks(element));
  if (!slices.length) throw new Error('Empty document');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: 'إجابة المعلم', creator: 'ممارس' });
  const pages = [];
  for (const [index, slice] of slices.entries()) {
    checkAborted(signal);
    const canvas = await html2canvas(element, {
      scale: 1.5, backgroundColor: '#ffffff', logging: false, useCORS: true,
      width: layout.width, height: slice.height, x: 0, y: slice.start,
      windowWidth: 1200, windowHeight: 900, scrollX: 0, scrollY: 0,
    });
    checkAborted(signal);
    const source = canvas.toDataURL('image/png');
    if (index) pdf.addPage();
    pdf.addImage(source, 'PNG', layout.marginMm, layout.marginMm,
      layout.widthMm, slice.height * layout.widthMm / layout.width);
    pdf.setFontSize(9).setTextColor(100);
    pdf.text(`${index + 1} / ${slices.length}`, 105, 290, { align: 'center' });
    pages.push(source);
    canvas.width = 0;
    canvas.height = 0;
  }
  return { blob: pdf.output('blob'), pages };
}
