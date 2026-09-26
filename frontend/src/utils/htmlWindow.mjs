// Opens generated HTML in a new tab through a Blob URL instead of the
// deprecated document.write(). The Blob URL is released after it has loaded.
export const openHtmlDocument = (html, { target = '_blank', features = '', windowApi = globalThis } = {}) => {
  const url = windowApi.URL.createObjectURL(new windowApi.Blob([html], { type: 'text/html;charset=utf-8' }));
  const openedWindow = windowApi.open(url, target, features);

  windowApi.setTimeout(() => windowApi.URL.revokeObjectURL(url), 60_000);

  return openedWindow;
};
