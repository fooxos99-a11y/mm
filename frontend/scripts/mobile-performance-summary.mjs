export const summarizeMobilePerformance = (results) => {
  if (results.length !== 3) throw new Error('Mobile performance requires three complete audits.');
  const samples = results.map((result) => {
    const lhr = result?.lhr;
    if (lhr?.runtimeError) {
      throw new Error(`Lighthouse runtime error: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
    }
    const score = lhr?.categories?.performance?.score;
    const lcp = lhr?.audits?.['largest-contentful-paint']?.numericValue;
    if (!Number.isFinite(score) || !Number.isFinite(lcp) || lcp <= 0) {
      throw new Error('Lighthouse returned incomplete performance measurements.');
    }
    return { score: Math.round(score * 100), lcp: Math.round(lcp) };
  });
  const median = (values) => [...values].sort((left, right) => left - right)[1];
  const score = median(samples.map((sample) => sample.score));
  const lcp = median(samples.map((sample) => sample.lcp));
  return { score, lcp, samples, result: results[samples.findIndex((sample) => sample.score === score)] };
};
