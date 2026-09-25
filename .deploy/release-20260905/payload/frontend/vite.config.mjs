import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import vuetify from 'vite-plugin-vuetify';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const exposedEnvironmentKeys = [
  'VUE_APP_API_BASE_URL',
  'VUE_APP_PUSHER_APP_CLUSTER',
  'VUE_APP_PUSHER_APP_KEY',
  'VUE_APP_PUSHER_HOST',
  'VUE_APP_PUSHER_PORT',
  'VUE_APP_PUSHER_SCHEME',
  'VUE_APP_ROUTER_BASE',
  'VUE_APP_STORAGE_NAMESPACE',
];

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, frontendRoot, 'VUE_APP_');
  const environment = Object.fromEntries(exposedEnvironmentKeys.map((key) => [
    key,
    process.env[key] ?? fileEnvironment[key],
  ]));
  const base = process.env.VUE_APP_PUBLIC_PATH
    || fileEnvironment.VUE_APP_PUBLIC_PATH
    || '/';

  return {
    base,
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(frontendRoot, 'src'),
      },
    },
    define: {
      'process.env': JSON.stringify({
        ...environment,
        BASE_URL: base,
        NODE_ENV: mode,
      }),
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      host: '127.0.0.1',
      port: 8080,
    },
  };
});
