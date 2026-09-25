<template>
  <div>
    <section class="landing-section faq-section">
      <div class="landing-shell">
        <div class="section-heading">
          <div class="section-heading__eyebrow">
            {{ content.faqEyebrow }}
          </div>
          <h2 class="section-heading__title">
            {{ content.faqTitle }}
          </h2>
          <p class="section-heading__text">
            {{ content.faqText }}
          </p>
        </div>

        <div class="faq-grid">
          <article
            v-for="item in faqItems"
            :key="item.question"
            class="faq-card"
          >
            <h3 class="faq-card__question">
              {{ item.question }}
            </h3>
            <p class="faq-card__answer">
              {{ item.answer }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-shell landing-footer__grid">
        <div>
          <div class="footer-brand">
            <div class="footer-brand__title">
              {{ content.footerBrandTitle }}
            </div>
          </div>
          <p class="footer-text">
            {{ content.footerDescription }}
          </p>
        </div>

        <div>
          <h4>{{ content.footerAboutTitle }}</h4>
          <ul class="footer-links">
            <li>
              <router-link :to="{ name: 'home' }">
                {{ content.footerHomeLabel }}
              </router-link>
            </li>
            <li>
              <router-link :to="{ name: 'practitioner' }">
                {{ content.footerLicensesLabel }}
              </router-link>
            </li>
          </ul>
        </div>

        <div>
          <h4>{{ content.footerContactTitle }}</h4>
          <ul class="footer-links footer-links--contact">
            <li>
              <AppSvgIcon icon="mdi-map-marker-outline" />
              <span>{{ content.footerAddress }}</span>
            </li>
            <li>
              <AppSvgIcon icon="mdi-phone-outline" />
              <span dir="ltr">{{ content.footerPhone }}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4>{{ content.footerPoliciesTitle }}</h4>
          <ul class="footer-links">
            <li><span class="footer-links__muted">{{ content.footerPrivacyLabel }}</span></li>
            <li><span class="footer-links__muted">{{ content.footerTermsLabel }}</span></li>
          </ul>
        </div>
      </div>

      <div class="landing-shell landing-footer__bottom">
        <div>© {{ currentYear }} {{ content.footerCopyright }}</div>
        <div class="landing-footer__developed">
          {{ content.footerDevelopedBy }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import AppSvgIcon from '../ui/AppSvgIcon.vue';

export default {
  name: 'HomeSupportingSections',
  components: { AppSvgIcon },
  props: {
    content: { type: Object, required: true },
    faqItems: { type: Array, default: () => [] },
    currentYear: { type: [Number, String], required: true },
  },
};
</script>
