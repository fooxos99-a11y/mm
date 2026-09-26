<template>
  <div class="program-card__body">
    <div class="program-card__top">
      <div
        class="program-card__icon-wrap"
        :style="{ background: program.cardColorLight }"
      >
        <AppSvgIcon
          :icon="program.icon"
          class="program-card__native-icon"
          :style="{ color: program.cardColor }"
        />
      </div>
      <span
        class="program-card__status-badge"
        :style="{ color: program.cardColor, background: program.cardColorLight }"
      >
        {{ program.status }}
      </span>
    </div>
    <h3
      class="program-card__title"
      :style="{ color: program.cardColor }"
    >
      {{ program.title }}
    </h3>
    <p class="program-card__text">
      {{ program.description }}
    </p>

    <div
      v-if="program.audience"
      class="program-card__audience"
    >
      {{ program.audience }}
    </div>

    <div
      v-if="program.stats.length"
      class="program-card__stats"
    >
      <div
        v-for="stat in program.stats"
        :key="stat.key"
        class="program-card__stat"
      >
        <strong>{{ animatedValue(stat.value) }}</strong>
        <span>{{ stat.label }}</span>
      </div>
    </div>

    <ul
      v-if="program.features && program.features.length"
      class="program-card__features"
    >
      <li
        v-for="feature in program.features"
        :key="feature"
        :style="{ '--dot-color': program.cardColor }"
      >
        {{ feature }}
      </li>
    </ul>

    <AppButton
      variant="plain"
      class="program-card__action"
      :style="program.available
        ? { background: program.cardColor, borderColor: program.cardColor }
        : {}"
      :disabled="!program.available"
      @click="$emit('open')"
    >
      {{ program.available ? content.programAvailableActionLabel : content.programUpcomingActionLabel }}
    </AppButton>
  </div>
</template>

<script>
import AppButton from '../ui/AppButton.vue';
import AppSvgIcon from '../ui/AppSvgIcon.vue';

export default {
  name: 'HomeStandardProgramCard',
  components: { AppButton, AppSvgIcon },
  props: {
    program: { type: Object, required: true },
    content: { type: Object, required: true },
    animatedValue: { type: Function, required: true },
  },
  emits: ['open'],
};
</script>
