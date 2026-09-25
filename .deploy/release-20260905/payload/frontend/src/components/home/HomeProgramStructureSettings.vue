<template>
  <div class="home-page-settings-details">
    <section class="home-page-settings__section">
      <div class="home-page-settings__section-header">
        <h3>المجالات والكفايات</h3>
      </div>
      <div class="home-page-settings__grid mb-5">
        <AppTextField
          v-model="localForm.competenciesTitle"
          label="عنوان قسم المجالات والكفايات"
          outlined
          dense
          hide-details="auto"
          class="home-page-settings__field--full"
        />
      </div>
      <div class="home-page-settings__cards">
        <article
          v-for="(domain, domainIndex) in localForm.domains"
          :key="`domain-${domainIndex}`"
          class="home-page-settings__card"
        >
          <div class="home-page-settings__card-head">
            <div class="home-page-settings__card-title">
              مجال {{ domainIndex + 1 }}
            </div>
            <AppIconButton
              variant="danger"
              size="sm"
              aria-label="حذف المجال"
              @click="$emit('delete-item', 'domains', domainIndex)"
            >
              <v-icon small>
                mdi-delete-outline
              </v-icon>
            </AppIconButton>
          </div>
          <div class="home-page-settings__grid">
            <AppTextField
              v-model="domain.title"
              label="عنوان المجال"
              outlined
              dense
              hide-details="auto"
              class="home-page-settings__field--full"
            />
            <AppTextField
              v-for="(item, itemIndex) in domain.items"
              :key="`domain-${domainIndex}-item-${itemIndex}`"
              v-model="domain.items[itemIndex]"
              :label="`الكفاية ${itemIndex + 1}`"
              outlined
              dense
              hide-details="auto"
            />
          </div>
        </article>
      </div>
    </section>

    <section class="home-page-settings__section">
      <div class="home-page-settings__section-header">
        <h3>ما يتضمنه البرنامج</h3>
      </div>
      <div class="home-page-settings__grid mb-5">
        <AppTextField
          v-model="localForm.includesTitle"
          label="عنوان القسم"
          outlined
          dense
          hide-details="auto"
          class="home-page-settings__field--full"
        />
      </div>
      <div class="home-page-settings__cards">
        <article
          v-for="(item, index) in localForm.includesItems"
          :key="`include-${index}`"
          class="home-page-settings__card"
        >
          <div class="home-page-settings__card-head">
            <div class="home-page-settings__card-title">
              العنصر {{ item.num }}
            </div>
            <AppIconButton
              variant="danger"
              size="sm"
              aria-label="حذف العنصر"
              @click="$emit('delete-item', 'includesItems', index)"
            >
              <v-icon small>
                mdi-delete-outline
              </v-icon>
            </AppIconButton>
          </div>
          <AppTextField
            v-model="item.title"
            label="النص الظاهر"
            outlined
            dense
            hide-details="auto"
          />
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { AppIconButton, AppTextField } from '../ui';

export default {
  name: 'HomeProgramStructureSettings',
  components: { AppIconButton, AppTextField },
  props: { form: { type: Object, required: true } },
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>

<style scoped>
.home-page-settings-details { display: contents; }
</style>
