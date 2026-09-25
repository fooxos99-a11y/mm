<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>نبذة البرنامج والأهداف</h3>
    </div>
    <div class="home-page-settings__grid">
      <AppTextField
        v-model="localForm.aboutEyebrow"
        label="العنوان الصغير للقسم"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.aboutTitlePrefix"
        label="بداية عنوان النبذة"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.aboutTitleHighlight"
        label="الكلمة المميزة في العنوان"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.goalsHeadingPrefix"
        label="بداية عنوان الأهداف"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.goalsHeadingHighlight"
        label="الكلمة المميزة في عنوان الأهداف"
        outlined
        dense
        hide-details="auto"
      />
      <v-textarea
        v-model="localForm.aboutLead"
        label="الفقرة التعريفية الأساسية"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
      <v-textarea
        v-model="localForm.aboutBody"
        label="الفقرة التوضيحية الثانية"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
    </div>
    <div class="home-page-settings__cards mt-5">
      <article
        v-for="(goal, index) in localForm.goals"
        :key="`goal-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            هدف {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف الهدف"
            @click="$emit('delete-item', 'goals', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <v-textarea
          v-model="localForm.goals[index]"
          :label="`نص الهدف ${index + 1}`"
          outlined
          rows="3"
          auto-grow
          hide-details="auto"
        />
      </article>
    </div>
  </section>
</template>

<script>
import { AppIconButton, AppTextField } from '../ui';

export default {
  name: 'HomeAboutSettings',
  components: { AppIconButton, AppTextField },
  props: { form: { type: Object, required: true } },
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
