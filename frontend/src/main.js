import { createApp } from 'vue';
import '@fontsource/tajawal/arabic-400.css';
import '@fontsource/tajawal/arabic-500.css';
import '@fontsource/tajawal/arabic-700.css';
import '@fontsource/tajawal/arabic-800.css';
import App from './App.vue';
import router from './router';
import store from './store';
import { installErrorMonitoring } from './plugins/errorMonitoring';
import { installToast } from './plugins/toast';
import { installStaleDeployRecovery } from './utils/staleDeployRecovery';
import './styles/main.css';

installStaleDeployRecovery();

const app = createApp(App);
installErrorMonitoring(app);
installToast(app);

// The public home page uses native shared components. Install Vuetify before
// resolving a route that uses its shell, without loading it for the first paint.
let vuetifyInstallation = null;
router.beforeResolve((to) => {
  if (!to.matched.length || to.matched.some((record) => record.meta.lightweightShell)) return;
  vuetifyInstallation ||= import('./plugins/vuetify')
    .then(({ default: vuetify }) => { app.use(vuetify); })
    .catch((error) => {
      vuetifyInstallation = null;
      throw error;
    });
  return vuetifyInstallation;
});

app.config.globalProperties.$dropdownMenuProps = Object.freeze({
  offsetY: true,
  maxHeight: 420,
  contentClass: 'app-dropdown-menu',
  closeOnContentClick: true,
});

const publicAssetBaseUrl = process.env.BASE_URL || '/';
app.config.globalProperties.$publicAsset = (path) => `${publicAssetBaseUrl}${String(path || '').replace(/^\/+/, '')}`;

app
  .use(router)
  .use(store);

// Resolve the initial route before mounting so its content paints immediately,
// without playing the transition intended for navigation between pages.
router.isReady().then(() => app.mount('#app'));
