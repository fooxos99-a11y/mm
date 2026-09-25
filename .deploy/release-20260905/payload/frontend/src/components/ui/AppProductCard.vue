<template>
  <article class="app-product-card">
    <div
      v-if="image"
      class="app-product-card__media"
    >
      <img
        :src="image"
        :alt="imageAlt || title"
      >
    </div>
    <div class="app-product-card__content">
      <div
        v-if="eyebrow"
        class="app-product-card__eyebrow"
      >
        {{ eyebrow }}
      </div>
      <h3 class="app-product-card__title">
        {{ title }}
      </h3>
      <p
        v-if="description"
        class="app-product-card__description"
      >
        {{ description }}
      </p>
      <div
        v-if="$slots.meta"
        class="app-product-card__meta"
      >
        <slot name="meta" />
      </div>
      <div
        v-if="$slots.actions"
        class="app-product-card__actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>

<script>
export default {
  name: 'AppProductCard',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
  },
};
</script>
