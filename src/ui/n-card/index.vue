<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'div' | 'article' | 'button' | 'label'
  greyed?: boolean
}>(), {
  as: 'div'
})
</script>

<template>
  <component
    :is="as"
    class="n-card"
    :class="{ 'n-card--greyed': greyed }"
    :type="as === 'button' ? 'button' : undefined"
  >
    <header v-if="$slots.header" class="n-card__header">
      <slot name="header" />
    </header>
    <slot />
    <footer v-if="$slots.footer" class="n-card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.n-card {
  box-sizing: border-box;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius);
  background: var(--n-surface);
  box-shadow: var(--n-shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  color: inherit;
  font: inherit;
  text-align: start;
}

.n-card::before {
  content: "";
  position: absolute;
  inset: 0 0 52% 0;
  z-index: -1;
  border-radius: var(--n-radius) var(--n-radius) 40% 40% / var(--n-radius) var(--n-radius) 14px 14px;
  background: var(--n-card-gloss);
  pointer-events: none;
}

button.n-card,
label.n-card {
  cursor: pointer;
}

.n-card:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}

.n-card--greyed {
  opacity: .55;
  filter: grayscale(.85);
}

.n-card__header {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.n-card__footer {
  display: flex;
  gap: 6px;
  margin-top: auto;
}
</style>
