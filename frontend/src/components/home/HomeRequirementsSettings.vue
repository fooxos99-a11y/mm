<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>المتطلبات وإتمام العرض</h3>
    </div>
    <div class="home-page-settings__grid mb-5">
      <AppTextField
        v-model="localForm.requirementsTitle"
        label="عنوان المتطلبات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.recitationTitle"
        label="عنوان إتمام العرض"
        outlined
        dense
        hide-details="auto"
      />
    </div>
    <div class="home-page-settings__cards">
      <article
        v-for="(item, index) in localForm.requirements"
        :key="`requirement-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            المتطلب {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف المتطلب"
            @click="$emit('delete-item', 'requirements', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <v-textarea
          v-model="localForm.requirements[index]"
          label="نص المتطلب"
          outlined
          rows="3"
          auto-grow
          hide-details="auto"
        />
      </article>
    </div>
    <div class="home-page-settings__cards mt-5">
      <article
        v-for="(item, index) in localForm.recitation"
        :key="`recitation-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            بطاقة العرض {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف بطاقة العرض"
            @click="$emit('delete-item', 'recitation', index)"
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
            label="النص"
            outlined
            dense
            hide-details="auto"
          />
        </div>
      </article>
    </div>
    <div class="home-page-settings__grid mt-5 mb-5">
      <AppTextField
        v-model="localForm.recitationMechanismTitle"
        label="عنوان آلية عرض القرآن"
        outlined
        dense
        hide-details="auto"
      />
    </div>
    <div class="home-page-settings__cards">
      <article
        v-for="(item, index) in localForm.recitationMechanismItems"
        :key="`recitation-mechanism-${index}`"
        class="home-page-settings__card"
      >
        <div class="home-page-settings__card-head">
          <div class="home-page-settings__card-title">
            بند آلية العرض {{ index + 1 }}
          </div>
          <AppIconButton
            variant="danger"
            size="sm"
            aria-label="حذف بند آلية العرض"
            @click="$emit('delete-item', 'recitationMechanismItems', index)"
          >
            <v-icon small>
              mdi-delete-outline
            </v-icon>
          </AppIconButton>
        </div>
        <v-textarea
          v-model="localForm.recitationMechanismItems[index]"
          label="نص البند"
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
  name: 'HomeRequirementsSettings',
  components: { AppIconButton, AppTextField },
  props: { form: { type: Object, required: true } },
  emits: ['delete-item'],
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
