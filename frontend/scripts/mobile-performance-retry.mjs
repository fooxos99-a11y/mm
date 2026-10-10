// Retry infrastructure failures only; a completed low-scoring audit is final.
export const runAuditWithRuntimeRetry = async (runAudit, {
  onResult = () => {},
  onError = () => {},
  warn = console.warn,
} = {}) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let result;
    try {
      result = await runAudit();
    } catch (error) {
      onError(error, attempt);
      const localConnectionFailure = error?.code === 'ECONNREFUSED'
        && error?.syscall === 'connect'
        && ['127.0.0.1', '::1'].includes(error?.address);
      if (attempt === 2 || !localConnectionFailure) throw error;
      warn(`Lighthouse attempt ${attempt} could not connect to local Chrome; retrying once.`);
      continue;
    }

    onResult(result, attempt);
    if (!result?.lhr?.runtimeError || attempt === 2) return result;
    warn(`Lighthouse attempt ${attempt} returned ${result.lhr.runtimeError.code}; retrying once.`);
  }
};

