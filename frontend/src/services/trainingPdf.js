import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Keep the parser out of the dashboard's initial bundle. Both flags are needed
// to prevent PDF.js fetching the remaining file while the reader is idle.
export async function createTrainingPdfTask(url, headers = {}, signal) {
  const { getDocument, GlobalWorkerOptions, PDFDataRangeTransport } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const httpHeaders = { Accept: 'application/pdf' };
  for (const key of ['Authorization', 'X-Department-Id']) {
    if (headers[key]) httpHeaders[key] = headers[key];
  }
  const controller = new AbortController();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', () => controller.abort(), { once: true });
  // Start with an explicit range: even on a fast connection no initial full-file
  // GET is transferred before PDF.js discovers the server's range support.
  const first = await fetch(url, { headers: { ...httpHeaders, Range: 'bytes=0-65535' }, credentials: 'include', signal: controller.signal });
  if (!first.ok) throw new Error(`PDF HTTP ${first.status}`);
  const initialData = new Uint8Array(await first.arrayBuffer());
  const length = Number(first.headers.get('Content-Range')?.match(/\/(\d+)$/)?.[1]);
  const etag = first.headers.get('ETag');
  if (etag) httpHeaders['If-Range'] = etag;
  const options = { disableAutoFetch: true, disableStream: true, rangeChunkSize: 65536, isEvalSupported: false };
  if (first.status !== 206 || !length) return getDocument({ ...options, data: initialData });
  const range = new PDFDataRangeTransport(length, initialData);
  let task;
  range.requestDataRange = (begin, end) => {
    fetch(url, { headers: { ...httpHeaders, Range: `bytes=${begin}-${end - 1}` }, credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (response.status !== 206) throw new Error('PDF range unavailable');
        const data = new Uint8Array(await response.arrayBuffer());
        if (data.length !== end - begin) throw new Error('Incomplete PDF range');
        range.onDataRange(begin, data);
      }).catch((error) => { if (!controller.signal.aborted) { task.onRangeError?.(error); task.destroy(); } });
  };
  range.abort = () => controller.abort();
  task = getDocument({ ...options, range, length });
  return task;
}
