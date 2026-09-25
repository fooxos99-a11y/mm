<template>
  <section
    id="home"
    class="hero-section"
  >
    <div class="hero-orbit hero-orbit--large" />
    <div class="hero-orbit hero-orbit--medium" />
    <div class="hero-glow" />
    <div class="hero-grid" />
    <div class="hero-top-shade" />

    <div class="landing-shell hero-section__inner">
      <div class="hero-copy">
        <div class="hero-logos">
          <img
            :src="$publicAsset('شعار-الجمعية.webp')"
            alt="شعار الجمعية"
            class="hero-logo hero-logo--association"
          >
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار برنامج رخصة ممارس"
            class="hero-logo"
          >
        </div>
        <div class="hero-divider" />
        <h1 class="hero-title">
          {{ pageContent.heroTitle }}
        </h1>
        <p class="hero-text">
          {{ pageContent.heroText }}
        </p>
        <div class="hero-actions">
          <AppButton
            variant="plain"
            href="#about"
            class="hero-outline-btn"
          >
            {{ pageContent.heroSecondaryButtonLabel }}
            <v-icon small>
              mdi-arrow-left
            </v-icon>
          </AppButton>
        </div>
      </div>
    </div>

    <div class="hero-bottom-fade" />
  </section>
</template>

<script>
import { AppButton } from '../ui';

export default {
  name: 'PractitionerHero',
  components: { AppButton },
  props: {
    pageContent: { type: Object, required: true },
  },
};
</script>

