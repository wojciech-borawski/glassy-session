<script setup lang="ts">
import NIcon from '../n-icon/index.vue'
import type { IconName } from '../n-icon/icons'

withDefaults(defineProps<{
  variant?: 'plain' | 'primary'
  icon?: IconName
  label?: string
  pressed?: boolean
}>(), {
  variant: 'plain',
  icon: undefined,
  label: undefined,
  pressed: undefined
})
</script>

<template>
  <button
    type="button"
    class="n-button"
    :class="{ 'n-button--primary': variant === 'primary', 'n-button--icon-only': !$slots.default }"
    :aria-label="label"
    :aria-pressed="pressed"
  >
    <NIcon v-if="icon" :name="icon" :size="14" />
    <slot />
  </button>
</template>

<style scoped>
.n-button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 11px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-control);
  background: var(--n-button-background);
  color: inherit;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.n-button:hover {
  background: var(--n-button-hover-background);
}

.n-button:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}

.n-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.n-button[aria-pressed="true"] {
  border-color: var(--n-accent);
  color: var(--n-accent);
}

.n-button--primary,
.n-button--primary:hover {
  border-color: var(--n-button-primary-border);
  background: var(--n-button-primary-background);
  box-shadow: var(--n-button-primary-shadow);
  color: var(--n-on-accent);
  font-weight: 600;
  text-shadow: var(--n-button-primary-text-shadow);
}

.n-button--primary:hover {
  filter: brightness(1.08);
}

.n-button--icon-only {
  width: 30px;
  padding: 5px;
}
</style>
