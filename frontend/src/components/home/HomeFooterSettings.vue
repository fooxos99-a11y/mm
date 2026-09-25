<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>التذييل وتسجيل الدخول</h3>
    </div>
    <div class="home-page-settings__grid">
      <AppTextField
        v-model="localForm.footerBrandTitle"
        label="اسم البرنامج في التذييل"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerQuickLinksTitle"
        label="عنوان الروابط السريعة"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerContactTitle"
        label="عنوان التواصل"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerAddress"
        label="العنوان"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerPhone"
        label="الهاتف"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerPoliciesTitle"
        label="عنوان السياسات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerPrivacyLabel"
        label="سياسة الخصوصية"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerTermsLabel"
        label="الشروط والأحكام"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.footerDevelopedBy"
        label="نص التطوير"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.loginDialogTitle"
        label="عنوان نافذة الدخول"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.loginCodeLabel"
        label="حقل رقم الدخول"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.loginPasswordLabel"
        label="حقل كلمة المرور"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.loginSubmitLabel"
        label="زر الدخول"
        outlined
        dense
        hide-details="auto"
      />
      <v-textarea
        v-model="localForm.footerDescription"
        label="وصف التذييل"
        outlined
        rows="4"
        auto-grow
        hide-details="auto"
        class="home-page-settings__field--full"
      />
      <AppTextField
        v-model="localForm.footerCopyright"
        label="نص الحقوق"
        outlined
        dense
        hide-details="auto"
        class="home-page-settings__field--full"
      />
    </div>
  </section>
</template>

<script>
import { AppTextField } from '../ui';

export default {
  name: 'HomeFooterSettings',
  components: { AppTextField },
  props: { form: { type: Object, required: true } },
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
