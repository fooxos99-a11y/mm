<template>
  <div class="registration-entry">
    <div class="registration-entry__orbit registration-entry__orbit--large" />
    <div class="registration-entry__orbit registration-entry__orbit--medium" />
    <div class="registration-entry__orbit registration-entry__orbit--small" />
    <div class="registration-entry__glow" />
    <div class="registration-entry__grid" />
    <div class="registration-entry__shade" />
    <div class="registration-entry__radial registration-entry__radial--one" />
    <div class="registration-entry__radial registration-entry__radial--two" />

    <v-container class="registration-entry__container py-8 py-md-12">
      <div class="registration-entry__stage">
        <v-card
          class="registration-entry__shell pa-5 pa-sm-6 pa-md-8"
          elevation="0"
        >
          <div class="registration-entry__brand">
            <img
              :src="$publicAsset('اللوقو-شفاف.webp')"
              alt="شعار برنامج رخصة ممارس"
              class="registration-entry__logo"
            >
            <div class="registration-entry__divider" />
            <h1 class="registration-entry__title">
              التسجيل في برنامج رخصة ممارس
            </h1>
          </div>

          <output
            v-if="registrationState === 'loading'"
            class="registration-entry__state d-block"
            aria-live="polite"
          >
            جارٍ تحميل التسجيل...
          </output>

          <AppErrorState
            v-else-if="registrationState === 'error'"
            class="registration-entry__state registration-entry__state--error"
            :message="loadError"
            @retry="loadStatus"
          />

          <div
            v-else-if="registrationState === 'closed'"
            class="registration-entry__state registration-entry__state--closed"
          >
            التسجيل مغلق حاليًا.
          </div>

          <output
            v-else-if="registrationState === 'success'"
            class="registration-entry__state registration-entry__state--success d-block"
            aria-live="polite"
          >
            تم الإرسال بنجاح
          </output>

          <form
            v-else-if="registrationState === 'open'"
            class="registration-entry__form"
            @submit.prevent="submitRegistration"
          >
            <div class="registration-entry__form-grid">
              <div class="registration-entry__field">
                <label
                  class="registration-entry__label"
                  for="registration-name"
                >{{ fixedLabels.name }}</label>
                <AppTextField
                  id="registration-name"
                  v-model.trim="form.name"
                  dense
                  outlined
                  hide-details
                  class="registration-entry__input"
                  :placeholder="fixedLabels.name"
                />
              </div>

              <div class="registration-entry__field">
                <label
                  class="registration-entry__label"
                  for="registration-gender"
                >{{ fixedLabels.gender }}</label>
                <AppSelect
                  id="registration-gender"
                  v-model="form.gender"
                  :items="genderOptions"
                  item-text="label"
                  item-value="value"
                  dense
                  outlined
                  hide-details
                  class="registration-entry__input"
                  :placeholder="`اختر ${fixedLabels.gender}`"
                />
              </div>

              <div class="registration-entry__field">
                <label
                  class="registration-entry__label"
                  for="registration-phone"
                >{{ fixedLabels.phone }}</label>
                <AppTextField
                  id="registration-phone"
                  v-model.trim="form.phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="10"
                  pattern="[0-9]*"
                  dense
                  outlined
                  hide-details
                  class="registration-entry__input"
                  :placeholder="fixedLabels.phone"
                  @input="form.phone = digitsOnly($event, 10)"
                />
              </div>

              <div
                v-for="field in registrationFields"
                :key="field.id"
                class="registration-entry__field"
              >
                <label
                  class="registration-entry__label"
                  :for="fieldInputId(field.id)"
                >{{ field.label }}</label>
                <AppTextField
                  v-if="field.type !== 'select'"
                  :id="fieldInputId(field.id)"
                  v-model.trim="form.answers[field.id]"
                  type="text"
                  :inputmode="field.type === 'number' ? 'numeric' : undefined"
                  :pattern="field.type === 'number' ? '[0-9]*' : undefined"
                  dense
                  outlined
                  hide-details
                  class="registration-entry__input"
                  :placeholder="field.label"
                  @input="field.type === 'number' && setNumericAnswer(field.id, $event)"
                />
                <AppSelect
                  v-else
                  :id="fieldInputId(field.id)"
                  v-model="form.answers[field.id]"
                  :items="field.options"
                  dense
                  outlined
                  hide-details
                  class="registration-entry__input"
                  :placeholder="field.label"
                />
              </div>
            </div>

            <div class="registration-entry__actions">
              <AppButton
                variant="primary"
                :loading="submitting"
                native-type="submit"
              >
                إرسال الطلب
              </AppButton>
            </div>
          </form>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script src="../features/controllers/RegistrationView.js"></script>

<style scoped src="../styles/views/registration-view.css"></style>
