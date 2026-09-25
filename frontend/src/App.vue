<template>
  <component :is="shellComponent">
    <router-view v-slot="{ Component }">
      <transition
        name="app-route"
        mode="out-in"
      >
        <component
          :is="Component"
          :key="routeViewKey"
        />
      </transition>
    </router-view>
  </component>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import PublicAppShell from './components/layout/PublicAppShell.vue';

const VuetifyAppShell = defineAsyncComponent(() => import(
  /* webpackChunkName: "vuetify-app-shell" */
  './components/layout/VuetifyAppShell.vue'
));

export default {
  name: 'AppRoot',
  components: { PublicAppShell, VuetifyAppShell },
  computed: {
    shellComponent() {
      const routeMatched = this.$route.matched.length > 0;
      const lightweightRoute = this.$route.matched.some((record) => record.meta.lightweightShell);

      return !routeMatched || lightweightRoute
        ? 'PublicAppShell'
        : 'VuetifyAppShell';
    },
    routeViewKey() {
      const routeName = this.$route?.name || this.$route?.path || 'route';
      const params = this.$route?.params || {};

      return `${routeName}:${JSON.stringify(params)}`;
    },
  },
};
</script>

<style>
.app-route-enter-active,
.app-route-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.app-route-enter-from,
.app-route-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .app-route-enter-active,
  .app-route-leave-active {
    transition: opacity 0.01s linear;
  }

  .app-route-enter-from,
  .app-route-leave-to {
    transform: none;
  }
}
</style>
