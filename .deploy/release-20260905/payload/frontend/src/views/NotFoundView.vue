<template>
  <v-container class="fill-height d-flex align-center justify-center py-12">
    <v-card
      outlined
      class="pa-8 page-card text-center"
      max-width="520"
    >
      <div class="text-overline mb-2">
        404
      </div>
      <h1 class="text-h5 font-weight-bold mb-3">
        الصفحة غير موجودة
      </h1>
      <p class="text-body-2 text--secondary mb-6">
        المسار المطلوب غير موجود داخل الهيكل الجديد.
      </p>
      <AppButton
        variant="primary"
        :to="{ name: 'home' }"
      >
        العودة للرئيسية
      </AppButton>
    </v-card>
  </v-container>
</template>

<script>
import { AppButton } from '../components/ui';

export default {
  name: 'NotFoundView',
  components: {
    AppButton,
  },
};
</script>

<style scoped>
.page-card {
  border-radius: 24px;
}
</style>
