let installed = false;
let toastRuntimePromise = null;
let placeholderSequence = 0;

const toastOptions = {
  position: 'top-center',
  timeout: 3000,
  closeButton: false,
  hideProgressBar: false,
  newestOnTop: true,
  maxToasts: 4,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  draggable: false,
  rtl: true,
  toastClassName: 'app-toast',
  bodyClassName: 'app-toast__body',
  containerClassName: 'app-toast-container',
  container: () => document.getElementById('app') || document.body,
};

const configureToastApi = (toastApi) => {
  if (!toastApi) return;

  ['success', 'error', 'info', 'warning'].forEach((methodName) => {
    if (typeof toastApi[methodName] !== 'function') return;

    const originalMethod = toastApi[methodName].bind(toastApi);

    toastApi[methodName] = (message, options = {}) => originalMethod(message, {
      timeout: 3000,
      hideProgressBar: false,
      pauseOnHover: false,
      pauseOnFocusLoss: false,
      draggable: false,
      ...options,
    });
  });
};

export const installToast = (app) => {
  if (installed) return app.config.globalProperties.$toast;

  const toastApi = createLazyToastApi(app);
  app.config.globalProperties.$toast = toastApi;
  installed = true;

  return toastApi;
};

const loadToastRuntime = (app) => {
  if (toastRuntimePromise) return toastRuntimePromise;

  toastRuntimePromise = Promise.all([
    import(/* webpackChunkName: "toast-runtime" */ 'vue-toastification'),
    import(/* webpackChunkName: "toast-runtime" */ 'vue-toastification/dist/index.css'),
    import(/* webpackChunkName: "toast-runtime" */ '../styles/toasts.css'),
  ]).then(([toastModule]) => {
    app.use(toastModule.default, toastOptions);
    const toastApi = toastModule.useToast();
    configureToastApi(toastApi);
    return toastApi;
  });

  return toastRuntimePromise;
};

const createLazyToastApi = (app) => {
  const idMap = new Map();
  const pendingDismissals = new Set();

  const show = (methodName, message, options = {}) => {
    const placeholderId = `lazy-toast-${++placeholderSequence}`;

    void loadToastRuntime(app).then((runtimeApi) => {
      const runtimeToastId = runtimeApi[methodName](message, options);
      idMap.set(placeholderId, runtimeToastId);

      if (pendingDismissals.delete(placeholderId)) {
        runtimeApi.dismiss(runtimeToastId);
        idMap.delete(placeholderId);
      }
    });

    return placeholderId;
  };

  return {
    success: (message, options) => show('success', message, options),
    error: (message, options) => show('error', message, options),
    info: (message, options) => show('info', message, options),
    warning: (message, options) => show('warning', message, options),
    dismiss: (toastId) => {
      if (!idMap.has(toastId)) pendingDismissals.add(toastId);

      void loadToastRuntime(app).then((runtimeApi) => {
        const runtimeToastId = idMap.get(toastId);
        if (runtimeToastId === undefined) return;

        runtimeApi.dismiss(runtimeToastId);
        idMap.delete(toastId);
        pendingDismissals.delete(toastId);
      });
    },
    clear: () => {
      pendingDismissals.clear();
      idMap.clear();
      void loadToastRuntime(app).then((runtimeApi) => runtimeApi.clear());
    },
  };
};
