<template>
  <section
    id="programs"
    ref="programsSection"
    class="landing-section programs-section"
  >
    <div class="landing-shell">
      <div class="section-heading">
        <h2 class="section-heading__title">
          {{ content.programsSectionTitle }}
        </h2>
      </div>

      <div class="programs-grid">
        <article
          v-for="(program, index) in programs"
          :key="program.key"
          class="program-card"
          :class="{
            'program-card--poster-design': program.poster,
            'program-card--manager-design': program.key === 'manager',
            'program-card--practitioner-design': program.key === 'practitioner',
            'program-card--from-right': index < 2,
            'program-card--from-left': index >= 2,
            'program-card--reveal-visible': programsRevealed,
          }"
          :style="program.posterVars || null"
        >
          <template v-if="program.poster">
            <div class="manager-license-card__circle" />

            <header class="manager-license-card__header">
              <h3>{{ program.title }}</h3>
              <div class="manager-license-card__line" />
              <p>{{ program.description }}</p>
            </header>

            <div class="manager-license-card__content">
              <div class="manager-license-card__illustration">
                <div class="manager-license-card__dots">
                  <span
                    v-for="dot in 12"
                    :key="dot"
                  />
                </div>

                <div class="manager-license-card__leaves">
                  <span class="manager-license-card__leaf manager-license-card__leaf--one" />
                  <span class="manager-license-card__leaf manager-license-card__leaf--two" />
                  <span class="manager-license-card__leaf manager-license-card__leaf--three" />
                  <span class="manager-license-card__leaf manager-license-card__leaf--four" />
                </div>

                <div class="manager-license-card__platform" />

                <div class="manager-license-card__document">
                  <svg
                    v-if="program.key !== 'manager'"
                    class="manager-license-card__certificate"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <template v-if="program.key === 'practitioner'">
                      <path d="M12 6C10.2 4.8 8.1 4.2 6 4.2C4.9 4.2 3.8 4.4 3 4.8V18.5C3.8 18.1 4.9 17.9 6 17.9C8.1 17.9 10.2 18.5 12 19.8C13.8 18.5 15.9 17.9 18 17.9C19.1 17.9 20.2 18.1 21 18.5V4.8C20.2 4.4 19.1 4.2 18 4.2C15.9 4.2 13.8 4.8 12 6Z" />
                      <path d="M12 6V19.8" />
                      <path d="M6 8.2C7.4 8.2 9.2 8.6 10.6 9.4" />
                      <path d="M18 8.2C16.6 8.2 14.8 8.6 13.4 9.4" />
                    </template>
                    <template v-else-if="program.key === 'supervisor'">
                      <path d="M8 3L10.5 8" />
                      <path d="M16 3L13.5 8" />
                      <path d="M9 3H15" />
                      <circle
                        cx="12"
                        cy="14"
                        r="6"
                      />
                      <path d="M12 10.8L13 12.9L15.3 13.2L13.65 14.8L14.05 17.1L12 16L9.95 17.1L10.35 14.8L8.7 13.2L11 12.9L12 10.8Z" />
                    </template>
                    <template v-else>
                      <path d="M3 7A2 2 0 0 1 5 5H9.8L12 7.4H19A2 2 0 0 1 21 9.4V17A2 2 0 0 1 19 19H5A2 2 0 0 1 3 17V7Z" />
                      <path d="M3 10H21" />
                      <path d="M7 14H14" />
                      <path d="M7 16.5H12" />
                    </template>
                  </svg>
                  <div
                    v-else
                    class="manager-license-card__briefcase"
                  />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--medium" />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--short" />
                  <span class="manager-license-card__doc-spacer" />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--long" />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--long" />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--long" />
                  <span class="manager-license-card__signature" />
                  <span class="manager-license-card__doc-line manager-license-card__doc-line--bottom" />
                </div>
              </div>

              <div class="manager-license-card__features">
                <div
                  v-for="(feature, featureIndex) in program.features"
                  :key="feature"
                  class="manager-license-card__feature"
                >
                  <div class="manager-license-card__icon-box">
                    <svg
                      v-if="featureIndex === 0"
                      class="manager-license-card__icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <template v-if="program.key === 'secretary'">
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          rx="2"
                        />
                        <path d="M8 8H16" />
                        <path d="M8 12H14" />
                        <path d="M8 16H12" />
                        <path d="M6.5 8L7 8.5L8 7.5" />
                      </template>
                      <template v-else-if="program.key === 'supervisor'">
                        <path d="M4 19V7" />
                        <path d="M4 19H20" />
                        <path d="M8 16V12" />
                        <path d="M12 16V9" />
                        <path d="M16 16V5" />
                        <path d="M8 12L12 9L16 5" />
                      </template>
                      <template v-else-if="program.key === 'practitioner'">
                        <path d="M4 12L8 16L20 4" />
                        <path d="M4 6H14" />
                        <path d="M4 18H10" />
                      </template>
                      <template v-else>
                        <path d="M4 19V5" />
                        <path d="M4 19H20" />
                        <path d="M8 16V11" />
                        <path d="M12 16V8" />
                        <path d="M16 16V13" />
                      </template>
                    </svg>
                    <svg
                      v-else-if="featureIndex === 1"
                      class="manager-license-card__icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <template v-if="program.key === 'secretary'">
                        <path d="M4 6A2 2 0 0 1 6 4H18A2 2 0 0 1 20 6V18A2 2 0 0 1 18 20H6A2 2 0 0 1 4 18Z" />
                        <path d="M8 4V20" />
                        <path d="M11 8H16" />
                        <path d="M11 12H16" />
                        <path d="M11 16H14" />
                      </template>
                      <template v-else-if="program.key === 'supervisor'">
                        <path d="M4 20H20" />
                        <circle
                          cx="7"
                          cy="9"
                          r="2"
                        />
                        <circle
                          cx="12"
                          cy="6"
                          r="2"
                        />
                        <circle
                          cx="17"
                          cy="12"
                          r="2"
                        />
                        <path d="M7 11V16" />
                        <path d="M12 8V16" />
                        <path d="M17 14V16" />
                      </template>
                      <template v-else-if="program.key === 'practitioner'">
                        <rect
                          x="4"
                          y="3"
                          width="16"
                          height="18"
                          rx="2"
                        />
                        <path d="M8 8H16" />
                        <path d="M8 12H16" />
                        <path d="M8 16H13" />
                        <path d="M15 16L17 18L20 14" />
                      </template>
                      <template v-else>
                        <rect
                          x="4"
                          y="5"
                          width="16"
                          height="14"
                          rx="2"
                        />
                        <path d="M8 9H16" />
                        <path d="M8 13H13" />
                        <path d="M16 2V6" />
                        <path d="M8 2V6" />
                      </template>
                    </svg>
                    <svg
                      v-else
                      class="manager-license-card__icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <template v-if="program.key === 'secretary'">
                        <rect
                          x="4"
                          y="5"
                          width="16"
                          height="15"
                          rx="2"
                        />
                        <path d="M8 3V7" />
                        <path d="M16 3V7" />
                        <path d="M4 10H20" />
                        <path d="M8 14H8.01" />
                        <path d="M12 14H12.01" />
                        <path d="M16 14H16.01" />
                        <path d="M15 18L16.2 19.2L18.5 16.7" />
                      </template>
                      <template v-else-if="program.key === 'supervisor'">
                        <circle
                          cx="7"
                          cy="8"
                          r="3"
                        />
                        <circle
                          cx="17"
                          cy="8"
                          r="3"
                        />
                        <path d="M7 11V15" />
                        <path d="M17 11V15" />
                        <path d="M7 15H17" />
                        <path d="M12 15V20" />
                      </template>
                      <template v-else-if="program.key === 'practitioner'">
                        <path d="M4 20H20" />
                        <path d="M7 16V10" />
                        <path d="M12 16V6" />
                        <path d="M17 16V12" />
                        <path d="M7 10L12 6L17 12" />
                      </template>
                      <template v-else>
                        <path d="M4 21V9L12 4L20 9V21" />
                        <path d="M9 21V14H15V21" />
                        <path d="M7 10H7.01" />
                        <path d="M17 10H17.01" />
                      </template>
                    </svg>
                  </div>
                  <span>{{ feature }}</span>
                </div>
              </div>
            </div>
          </template>

          <HomeStandardProgramCard
            v-else
            :program="program"
            :content="content"
            :animated-value="animatedValue"
            @open="$emit('open-program', program)"
          />
        </article>
      </div>
    </div>
  </section>
</template>
<script>
import HomeStandardProgramCard from './HomeStandardProgramCard.vue';

export default {
  name: 'HomeProgramsSection',
  components: { HomeStandardProgramCard },
  props: {
    content: { type: Object, required: true },
    programs: { type: Array, default: () => [] },
    programsRevealed: { type: Boolean, default: false },
    animatedValue: { type: Function, required: true },
  },
  emits: ['open-program'],
};
</script>
