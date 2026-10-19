export const DOCUMENT_PDF_LAYOUT = Object.freeze({ width: 688, height: 1016, marginMm: 14, widthMm: 182 });

export function documentPageSlices(height, blocks = [], pageHeight = DOCUMENT_PDF_LAYOUT.height) {
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) return [];
  const protectedBlocks = blocks.filter(block => Number.isFinite(block.top) && Number.isFinite(block.bottom)
    && block.bottom > block.top && block.bottom - block.top <= pageHeight);
  const slices = [];
  let start = 0;
  while (start < height) {
    let end = Math.min(start + pageHeight, height);
    if (end < height) {
      let previous;
      do {
        previous = end;
        for (const block of protectedBlocks) {
          if (block.top > start + 1 && block.top < end && block.bottom > end) end = Math.floor(block.top);
        }
      } while (end !== previous);
    }
    slices.push({ start, height: end - start });
    start = end;
  }
  return slices;
}
