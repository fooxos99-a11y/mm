import base from './playwright.config.mjs';
export default {
  ...base,
  testMatch: 'fixes-webkit.spec.mjs',
  outputDir: '../../webkit-fixes-results',
  timeout: 150000,
};
