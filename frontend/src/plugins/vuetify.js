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
          primary: '#1f6f96',
          secondary: '#164e63',
          accent: '#ea580c',
        },
      },
    },
  },
});
