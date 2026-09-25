<template>
  <main>
    <section
      id="about"
      class="content-section content-section--soft"
    >
      <div class="landing-shell narrow-shell about-shell">
        <div class="section-pill section-pill--center">
          <span class="section-pill__dot" />
          {{ pageContent.aboutEyebrow }}
        </div>
        <h2 class="section-heading">
          {{ pageContent.aboutTitlePrefix }} <span>{{ pageContent.aboutTitleHighlight }}</span>
        </h2>
        <p class="section-lead">
          {{ pageContent.aboutLead }}
        </p>
        <p class="section-copy section-copy--center">
          {{ pageContent.aboutBody }}
        </p>

        <div class="goals-panel">
          <h3 class="sub-heading">
            {{ pageContent.goalsHeadingPrefix }} <span>{{ pageContent.goalsHeadingHighlight }}</span>
          </h3>
          <ul class="goals-grid">
            <li
              v-for="goal in pageGoals"
              :key="goal"
              class="goal-card"
            >
              <p>{{ goal }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="content-section content-section--soft stats-section">
      <div
        ref="programStatsSection"
        class="landing-shell landing-shell--wide section-layer"
      >
        <div class="stats-heading">
          <h2 class="our-numbers__title">
            أرقامنا
          </h2>
        </div>

        <div class="our-numbers__graduates our-numbers__graduates--program">
          <article
            v-for="indicator in programIndicators"
            :key="indicator.key"
            class="our-numbers__graduate-item"
          >
            <strong>{{ animatedValue(indicator.display) }}</strong>
            <span>
              {{ indicator.label }}
            </span>
          </article>
        </div>
      </div>
    </section>

    <section
      id="competencies"
      class="content-section content-section--pattern content-section--decorated"
    >
      <div class="decor-blob decor-blob--top-right" />
      <div class="decor-blob decor-blob--bottom-left" />

      <div class="landing-shell section-layer">
        <div class="section-ribbon section-ribbon--dark">
          <h2>{{ pageContent.competenciesTitle }}</h2>
        </div>

        <div class="domains-grid">
          <article
            v-for="domain in pageDomains"
            :key="domain.title"
            class="domain-card"
          >
            <div class="domain-card__header">
              <div class="domain-card__title-wrap">
                <span class="domain-card__bar" />
                <h3>{{ domain.title }}</h3>
              </div>
              <div class="domain-card__icon">
                <v-icon>{{ domain.icon }}</v-icon>
              </div>
            </div>
            <ul>
              <li
                v-for="(item, index) in domain.items"
                :key="item"
              >
                <span class="domain-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section
      id="includes"
      class="content-section content-section--soft content-section--rings"
    >
      <div class="rings-layer">
        <div class="rings-layer__ring rings-layer__ring--outer" />
        <div class="rings-layer__ring rings-layer__ring--inner" />
      </div>

      <div class="landing-shell section-layer">
        <div class="section-ribbon">
          <h2>{{ pageContent.includesTitle }}</h2>
        </div>

        <div class="includes-grid">
          <article
            v-for="item in pageIncludesItems"
            :key="item.num"
            class="include-card"
          >
            <div class="include-card__badge">
              {{ item.num }}
            </div>
            <h3>{{ item.title }}</h3>
            <div class="include-card__line" />
          </article>
        </div>
      </div>
    </section>

    <section
      id="requirements"
      class="content-section content-section--pattern content-section--decorated"
    >
      <div class="decor-blob decor-blob--top-left" />
      <div class="decor-blob decor-blob--bottom-right" />

      <div class="landing-shell section-layer">
        <div class="section-ribbon section-ribbon--dark">
          <h2>{{ pageContent.requirementsTitle }}</h2>
        </div>

        <div class="requirements-list">
          <article
            v-for="item in pageRequirements"
            :key="item.text"
            class="requirement-row"
          >
            <div class="requirement-row__icon">
              <v-icon>{{ item.icon }}</v-icon>
            </div>
            <p>{{ item.text }}</p>
          </article>
        </div>

        <div class="recitation-panel">
          <div class="recitation-panel__heading">
            <span class="recitation-panel__bar" />
            <h3>{{ pageContent.recitationTitle }}</h3>
          </div>
          <div class="recitation-grid recitation-grid--split">
            <article
              v-for="item in pageRecitation"
              :key="item.tag"
              class="recitation-card"
            >
              <span class="recitation-card__tag">{{ item.tag }}</span>
              <div class="recitation-card__body">
                <div class="recitation-card__icon recitation-card__icon--light">
                  <v-icon>{{ item.icon }}</v-icon>
                </div>
                <div>{{ item.text }}</div>
              </div>
            </article>
          </div>
        </div>

        <div class="recitation-mechanism">
          <div class="recitation-mechanism__header">
            <div class="recitation-mechanism__icon">
              <v-icon>mdi-book-open-variant</v-icon>
            </div>
            <h3>{{ pageContent.recitationMechanismTitle }}</h3>
          </div>
          <div class="recitation-mechanism__list">
            <article
              v-for="(item, index) in pageContent.recitationMechanismItems"
              :key="`${index}-${item}`"
              class="recitation-mechanism__item"
            >
              <span class="recitation-mechanism__bullet">{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section
      id="duration"
      class="content-section content-section--soft content-section--decorated"
    >
      <div class="decor-blob decor-blob--top-right" />

      <div class="landing-shell narrow-shell section-layer">
        <div class="section-ribbon">
          <h2>{{ pageContent.durationTitle }}</h2>
        </div>

        <div class="duration-quick-grid">
          <article
            v-for="item in pageDurationQuickInfo"
            :key="item.label"
            class="duration-quick-card"
          >
            <span class="duration-quick-card__tag">{{ item.label }}</span>
            <div class="duration-quick-card__body">
              <div class="duration-quick-card__value">
                {{ item.value }}
              </div>
            </div>
          </article>
        </div>

        <div class="duration-text-card">
          <p>
            {{ pageContent.durationDescriptionPrimary }}
          </p>
          <p>
            {{ pageContent.durationDescriptionSecondary }}
          </p>
        </div>

        <div class="start-dates-section">
          <div class="start-dates-heading">
            <span />
            <h3>{{ pageContent.startDatesTitle }}</h3>
            <span />
          </div>
          <div class="start-dates-list">
            <article
              v-for="date in pageStartDates"
              :key="date.tag"
              class="start-date-card"
            >
              <span class="start-date-card__tag">{{ date.tag }}</span>
              <div class="start-date-card__body">
                <div class="start-date-card__icon start-date-card__icon--light">
                  <v-icon>mdi-calendar-month</v-icon>
                </div>
                <div>{{ date.text }}</div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
<script>
export default {
  name: 'PractitionerContent',
  props: {
    pageContent: { type: Object, required: true },
    pageGoals: { type: Array, default: () => [] },
    pageDomains: { type: Array, default: () => [] },
    pageIncludesItems: { type: Array, default: () => [] },
    pageRequirements: { type: Array, default: () => [] },
    pageRecitation: { type: Array, default: () => [] },
    pageDurationQuickInfo: { type: Array, default: () => [] },
    pageStartDates: { type: Array, default: () => [] },
    programIndicators: { type: Array, default: () => [] },
    animatedValue: { type: Function, required: true },
  },
};
</script>