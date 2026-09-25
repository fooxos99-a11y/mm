<template>
  <section
    class="app-state app-state--error"
    role="alert"
  >
    <v-icon
      class="app-state__icon"
      size="38"
    >
      {{ icon }}
    </v-icon>
    <h3 class="app-state__title">
      {{ title }}
    </h3>
    <p
      v-if="message"
      class="app-state__description"
    >
      {{ message }}
    </p>
    <AppButton
      v-if="retryLabel"
      variant="secondary"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </AppButton>
  </section>
</template>

<script>
import AppButton from '../AppButton.vue';

export default {
  name: 'AppErrorState',
  components: { AppButton },
  props: {
    title: { type: String, default: 'تعذر تحميل المحتوى' },
    message: { type: String, default: '' },
    retryLabel: { type: String, default: 'إعادة المحاولة' },
    icon: { type: String, default: 'mdi-alert-circle-outline' },
  },
};
</script>
