<template>
  <header
    class="public-header"
    :class="{ 'public-header--scrolled': scrolled }"
    dir="rtl"
  >
    <div class="public-header__inner">
      <a
        href="#home"
        class="public-header__brand"
        :aria-label="brandTitle"
      >
        <span class="public-header__logos">
          <img
            :src="$publicAsset('شعار-الجمعية.webp')"
            alt="شعار الجمعية"
            class="public-header__logo"
            width="326"
            height="320"
          >
          <img
            v-if="programLogo"
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار برنامج رخصة ممارس"
            class="public-header__logo"
          >
        </span>
        <span class="public-header__title">{{ brandTitle }}</span>
      </a>

      <nav
        v-if="sectionLinks.length"
        class="public-header__sections"
        aria-label="أقسام البرنامج"
      >
        <a
          v-for="item in sectionLinks"
          :key="item.href"
          :href="item.href"
        >{{ item.label }}</a>
      </nav>

      <div class="public-header__actions">
        <slot name="account" />
        <LicenseProgramsMenu
          ref="programMenu"
          :programs="navigationPrograms"
          :current-key="currentKey"
          :section-links="sectionLinks"
          @open="$emit('menu-open')"
          @select="$emit('open-program', $event)"
        />
      </div>
    </div>
  </header>
</template>

<script>
import LicenseProgramsMenu from './LicenseProgramsMenu.vue';

export default {
  name: 'PublicLandingHeader',
  components: { LicenseProgramsMenu },
  props: {
    brandTitle: { type: String, required: true },
    scrolled: { type: Boolean, default: false },
    programLogo: { type: Boolean, default: false },
    programs: { type: Array, default: () => [] },
    currentKey: { type: String, required: true },
    sectionLinks: { type: Array, default: () => [] },
  },
  emits: ['open-program', 'menu-open'],
  computed: {
    navigationPrograms() {
      return [
        { key: 'home', title: 'الرئيسية', icon: 'mdi-home-outline', available: true, route: { name: 'home' } },
        ...this.programs,
      ];
    },
  },
  methods: {
    closeMenu() {
      this.$refs.programMenu.closeMenu();
    },
  },
};
</script>

<style scoped>
.public-header {
  --public-header-color: #fff;
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  color: var(--public-header-color);
  font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
  transition: background 180ms ease, color 180ms ease;
}
.public-header--scrolled {
  --public-header-color: #08384a;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #dce9ed;
  box-shadow: 0 8px 24px -18px rgba(8, 56, 74, 0.3);
  backdrop-filter: blur(16px);
}
.public-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: min(1180px, calc(100% - 32px));
  min-height: 72px;
  margin-inline: auto;
}
.public-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.public-header__logos { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.public-header__logo { display: block; width: auto; height: 40px; object-fit: contain; filter: brightness(0) invert(1); }
.public-header--scrolled .public-header__logo { filter: none; }
.public-header__title { display: none; font-size: 1rem; font-weight: 800; line-height: 1.4; }
.public-header__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.public-header__sections { display: none; align-items: center; justify-content: center; gap: 4px; }
.public-header__sections a { padding: 12px; color: inherit; font-weight: 700; text-decoration: none; white-space: nowrap; border-radius: 10px; }
.public-header__sections a:hover { background: rgba(127, 169, 185, 0.16); }
.public-header__brand:focus-visible,
.public-header__sections a:focus-visible,
.public-header__actions :deep(.public-header__action:focus-visible) { outline: 2px solid currentColor; outline-offset: 3px; }
.public-header__actions :deep(.public-header__action) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: inherit;
}
.public-header__actions :deep(.public-header__action:hover) { background: rgba(127, 169, 185, 0.16); }
.public-header__actions :deep(.public-header__action-icon) { display: block; width: 24px; height: 24px; }
@media (min-width: 640px) {
  .public-header__inner { min-height: 84px; }
  .public-header__logo { height: 48px; }
  .public-header__title { display: block; }
}
@media (min-width: 1200px) {
  .public-header__sections { display: flex; }
}
@media (prefers-reduced-motion: reduce) {
  .public-header { transition: none; }
}
</style>
