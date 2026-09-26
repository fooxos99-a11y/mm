<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>المقدمة والتنقل</h3>
    </div>
    <div class="home-page-settings__grid">
      <AppTextField
        v-model="localForm.brandTitle"
        label="اسم البرنامج في الهيدر"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.heroTitle"
        label="العنوان الرئيسي"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.heroPrimaryButtonLabel"
        label="زر التسجيل"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.heroSecondaryButtonLabel"
        label="زر التعرف على البرنامج"
        outlined
        dense
        hide-details="auto"
      />
      <v-textarea
        v-model="localForm.heroText"
        label="الوصف الرئيسي"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
    </div>
    <div class="home-page-settings__cards mt-5">
      <article
        v-for="(item, index) in localForm.navItems"
        :key="`nav-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            رابط التنقل {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف رابط التنقل"
            @click="$emit('delete-item', 'navItems', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <AppTextField
          v-model="item.label"
          :label="`اسم الرابط ${index + 1}`"
          outlined
          dense
          hide-details="auto"
        />
      </article>
    </div>
  </section>
</template>

<script>
import { AppIconButton, AppTextField } from '../ui';

export default {
  name: 'HomeIntroSettings',
  components: { AppIconButton, AppTextField },
  props: { form: { type: Object, required: true } },
  emits: ['delete-item'],
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
