<template>
  <div class="landing-page home-page">
    <header
      class="landing-header"
      :class="{ 'landing-header--scrolled': scrolled }"
    >
      <div class="landing-shell landing-header__inner">
        <a
          href="#home"
          class="brand-mark"
        >
          <div class="brand-mark__logos">
            <img
              :src="$publicAsset('شعار-الجمعية.webp')"
              alt="شعار الجمعية"
              class="site-logo"
              :class="{ 'site-logo--light': !scrolled }"
              width="326"
              height="320"
            >
          </div>
          <div
            class="brand-mark__text"
            :class="{ 'brand-mark__text--light': !scrolled }"
          >
            {{ homePageContent.brandTitle }}
          </div>
        </a>

        <div class="landing-header__actions">
          <LicenseProgramsMenu
            :programs="licensePrograms"
            @select="openProgram"
          />
        </div>
      </div>
    </header>

    <section
      id="home"
      class="hero-section hero-section--licenses"
    >
      <div class="hero-orbit hero-orbit--large" />
      <div class="hero-orbit hero-orbit--medium" />
      <div class="hero-orbit hero-orbit--small" />
      <div class="hero-glow" />
      <div class="hero-grid" />
      <div class="hero-top-shade" />
      <div class="hero-radial hero-radial--one" />
      <div class="hero-radial hero-radial--two" />

      <div class="landing-shell hero-section__inner">
        <div class="hero-layout">
          <div class="hero-copy hero-copy--licenses">
            <div class="hero-logos hero-logos--centered">
              <img
                :src="$publicAsset('شعار-الجمعية.webp')"
                alt="شعار الجمعية"
                class="hero-logo hero-logo--association hero-logo--hero-white"
                width="326"
                height="320"
                fetchpriority="high"
              >
            </div>
            <div class="hero-divider" />
            <h1 class="hero-title">
              {{ homePageContent.heroTitle }}
            </h1>
            <p class="hero-text">
              {{ homePageContent.heroText }}
            </p>

            <div class="hero-actions">
              <AppButton
                variant="plain"
                class="hero-primary-btn"
                @click="scrollToSection('programs')"
              >
                {{ homePageContent.heroPrimaryButtonLabel }}
              </AppButton>

              <AppButton
                variant="plain"
                class="hero-outline-btn hero-outline-btn--licenses"
                @click="scrollToSection('achievements')"
              >
                {{ homePageContent.heroSecondaryButtonLabel }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-bottom-fade" />
    </section>

    <section
      id="achievements"
      ref="achievementsSection"
      class="landing-section achievements-section"
    >
      <div class="landing-shell">
        <div class="our-numbers">
          <h2 class="our-numbers__title">
            أرقامنا
          </h2>
          <div class="our-numbers__row">
            <div class="our-numbers__stat">
              <div class="our-numbers__num">
                {{ animatedStatValue(publicStats ? publicStats.batches : 0) }}<span class="our-numbers__plus">+</span>
              </div>
              <div class="our-numbers__lbl">
                عدد الدفعات
              </div>
            </div>
            <div class="our-numbers__divider" />
            <div class="our-numbers__stat">
              <div class="our-numbers__num">
                {{ animatedStatValue(publicStats ? publicStats.courses : 0) }}<span class="our-numbers__plus">+</span>
              </div>
              <div class="our-numbers__lbl">
                عدد الدورات
              </div>
            </div>
            <div class="our-numbers__divider" />
            <div class="our-numbers__stat">
              <div class="our-numbers__num">
                {{ animatedStatValue(publicStats ? publicStats.graduates : 0) }}<span class="our-numbers__plus">+</span>
              </div>
              <div class="our-numbers__lbl">
                عدد الخريجين
              </div>
            </div>
          </div>
          <div class="our-numbers__graduates">
            <div
              v-for="item in graduateDetailStats"
              :key="item.key"
              class="our-numbers__graduate-item"
            >
              <span>{{ item.label }}</span>
              <strong>{{ animatedStatValue(item.value) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <HomeProgramsSection
      v-if="programsMounted"
      ref="programsSection"
      :content="homePageContent"
      :programs="licensePrograms"
      :programs-revealed="programsRevealed"
      :animated-value="animatedStatValue"
      @open-program="openProgram"
    />
    <div
      v-else
      id="programs"
      ref="programsTrigger"
      class="home-deferred-anchor"
      aria-hidden="true"
    />

    <HomeSupportingSections
      v-if="supportingContentMounted"
      :content="homePageContent"
      :faq-items="faqItems"
      :current-year="currentYear"
    />
    <div
      v-else
      ref="supportingContentTrigger"
      class="home-deferred-trigger"
      aria-hidden="true"
    />

    <PublicAccountDialogs
      v-if="loginDialogOpen || profileDialogOpen"
      :login-open="loginDialogOpen"
      :profile-open="profileDialogOpen"
      :login-code="loginForm.loginCode"
      :password="loginForm.password"
      :auth-error="authError"
      :auth-loading="authLoading"
      :current-user="currentUser"
      :profile-name="profileName"
      :account-role-label="accountRoleLabel"
      @update:login-open="loginDialogOpen = $event"
      @update:profile-open="profileDialogOpen = $event"
      @update:login-code="loginForm.loginCode = $event"
      @update:password="loginForm.password = $event"
      @close-login="closeLoginDialog"
      @close-profile="closeProfileDialog"
      @submit-login="submitLoginDialog"
    >
      <template #brand>
        <img
          :src="$publicAsset('شعار-الجمعية.webp')"
          alt="شعار الجمعية"
          class="login-modal__logo"
        >
      </template>
    </PublicAccountDialogs>
  </div>
</template>

<script src="../features/home/homeView.js"></script>

<style src="../styles/views/home.css"></style>
<style src="../styles/views/home-license-card.css"></style>
<style src="../styles/views/home-navigation.css"></style>
<style src="../styles/views/home-mobile-dialogs.css"></style>
<style src="../styles/views/home-statistics.css"></style>
