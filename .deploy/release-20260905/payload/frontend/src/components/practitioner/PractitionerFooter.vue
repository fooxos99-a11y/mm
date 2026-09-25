<template>
  <footer class="landing-footer">
    <div class="landing-shell landing-footer__grid">
      <div>
        <div class="footer-brand">
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار برنامج رخصة ممارس"
            class="footer-brand__logo"
          >
          <div class="footer-brand__title">
            {{ pageContent.footerBrandTitle }}
          </div>
        </div>
        <p class="footer-text">
          {{ pageContent.footerDescription }}
        </p>
      </div>

      <div>
        <h4>{{ pageContent.footerQuickLinksTitle }}</h4>
        <ul class="footer-links">
          <li
            v-for="item in pageNavItems"
            :key="item.href"
          >
            <a :href="item.href">{{ item.label }}</a>
          </li>
        </ul>
      </div>

      <div>
        <h4>{{ pageContent.footerContactTitle }}</h4>
        <ul class="footer-links footer-links--contact">
          <li>
            <v-icon small>
              mdi-map-marker-outline
            </v-icon><span>{{ pageContent.footerAddress }}</span>
          </li>
          <li>
            <v-icon small>
              mdi-phone-outline
            </v-icon><span dir="ltr">{{ pageContent.footerPhone }}</span>
          </li>
        </ul>
      </div>

      <div>
        <h4>{{ pageContent.footerPoliciesTitle }}</h4>
        <ul class="footer-links">
          <li><span class="footer-links__muted">{{ pageContent.footerPrivacyLabel }}</span></li>
          <li><span class="footer-links__muted">{{ pageContent.footerTermsLabel }}</span></li>
        </ul>
      </div>
    </div>

    <div class="landing-shell landing-footer__bottom">
      <div>© {{ currentYear }} {{ pageContent.footerCopyright }}</div>
      <div class="landing-footer__developed">
        {{ pageContent.footerDevelopedBy }}
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'PractitionerFooter',
  props: {
    pageContent: { type: Object, required: true },
    pageNavItems: { type: Array, default: () => [] },
    currentYear: { type: Number, required: true },
  },
};
</script>

