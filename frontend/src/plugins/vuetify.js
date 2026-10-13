import { createVuetify } from 'vuetify';
import * as directives from 'vuetify/directives';
import { ar } from 'vuetify/locale';
import AppSvgIcon from '@/components/ui/AppSvgIcon.vue';
import { appIconPaths, vuetifyControlIconAliases } from '@/plugins/icons';

export default createVuetify({
  directives,
  icons: {
    defaultSet: 'app',
    aliases: { ...appIconPaths, ...vuetifyControlIconAliases },
    sets: {
      app: { component: AppSvgIcon },
    },
  },
  locale: {
    locale: 'ar',
    fallback: 'ar',
    messages: {
      ar: {
        ...ar,
        noDataText: 'لا توجد بيانات',
      },
    },
    rtl: { ar: true },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1D6A85',
          secondary: '#17394B',
          background: '#F5F8FA',
          surface: '#FFFFFF',
          'on-surface': '#17394B',
          success: '#16805D',
          error: '#D14343',
          accent: '#ea580c',
        },
      },
    },
  },
});
