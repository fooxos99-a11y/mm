<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>مدة البرنامج والبداية</h3>
    </div>
    <div class="home-page-settings__grid mb-5">
      <AppTextField
        v-model="localForm.durationTitle"
        label="عنوان مدة البرنامج"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.startDatesTitle"
        label="عنوان البداية"
        outlined
        dense
        hide-details="auto"
      />
      <v-textarea
        v-model="localForm.durationDescriptionPrimary"
        label="الوصف الأول لمدة البرنامج"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
      <v-textarea
        v-model="localForm.durationDescriptionSecondary"
        label="الوصف الثاني لمدة البرنامج"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
    </div>
    <div class="home-page-settings__cards">
      <article
        v-for="(item, index) in localForm.durationQuickInfo"
        :key="`duration-info-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            بطاقة المدة {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف بطاقة المدة"
            @click="$emit('delete-item', 'durationQuickInfo', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <div class="home-page-settings__grid">
          <AppTextField
            v-model="item.label"
            label="العنوان"
            outlined
            dense
            hide-details="auto"
          />
          <AppTextField
            v-model="item.value"
            label="القيمة"
            outlined
            dense
            hide-details="auto"
          />
        </div>
      </article>
    </div>
    <div class="home-page-settings__cards mt-5">
      <article
        v-for="(item, index) in localForm.startDates"
        :key="`start-date-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            تاريخ البداية {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف تاريخ البداية"
            @click="$emit('delete-item', 'startDates', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <div class="home-page-settings__grid">
          <AppTextField
            v-model="item.tag"
            label="التصنيف"
            outlined
            dense
            hide-details="auto"
          />
          <AppTextField
            v-model="item.text"
            label="التاريخ"
            outlined
            dense
            hide-details="auto"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { AppIconButton, AppTextField } from '../ui';

export default {
  name: 'HomeScheduleSettings',
  components: { AppIconButton, AppTextField },
  props: { form: { type: Object, required: true } },
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
