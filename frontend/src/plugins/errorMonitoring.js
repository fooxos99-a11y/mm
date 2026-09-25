let reporterPromise = null;

const loadReporter = () => {
  if (!reporterPromise) {
    reporterPromise = import(
      /* webpackChunkName: "client-telemetry" */
      '../services/clientTelemetryApi'
    ).then(({ reportClientError }) => reportClientError)
      .catch((error) => {
        reporterPromise = null;
        throw error;
      });
  }

  return reporterPromise;
};

const normalizeError = (error, context = '') => ({
  message: String(error?.message || error || 'Unknown client error').slice(0, 500),
  context: String(context || '').slice(0, 200),
  path: typeof window === 'undefined' ? '' : window.location.pathname.slice(0, 500),
});

const send = (error, context) => {
  const payload = normalizeError(error, context);
  loadReporter()
    .then((reportClientError) => reportClientError(payload))
    .catch(() => {});
};

export const installErrorMonitoring = (app) => {
  app.config.errorHandler = (error, vm, info) => send(error, info);

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => send(event.reason, 'unhandledrejection'));
  }
};
