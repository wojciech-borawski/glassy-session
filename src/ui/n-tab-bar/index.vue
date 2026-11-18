<script setup lang="ts">
import NIcon from '../n-icon/index.vue'
import type { IconName } from '../n-icon/icons'

defineProps<{
  label: string
  tabs: readonly { id: string, label: string, icon: IconName }[]
  current: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <nav class="n-tab-bar" :aria-label="label">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="n-tab-bar__tab"
      :aria-current="tab.id === current ? 'page' : undefined"
      @click="emit('select', tab.id)"
    >
      <NIcon class="n-tab-bar__icon" :name="tab.icon" :size="18" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.n-tab-bar {
  box-sizing: border-box;
  display: flex;
  gap: 2px;
  padding: 4px 6px;
  border-top: 1px solid var(--n-line);
  background: var(--n-surface-soft);
}

.n-tab-bar__tab {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
  padding: 5px 2px;
  border: 0;
  border-radius: var(--n-radius-control);
  background: none;
  color: var(--n-text-muted);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}

.n-tab-bar__tab:hover {
  background: var(--n-surface);
}

.n-tab-bar__tab:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}

.n-tab-bar__tab[aria-current="page"] {
  background: var(--n-surface);
  color: var(--n-tab-current-label);
  font-weight: 600;
}

.n-tab-bar__tab[aria-current="page"] .n-tab-bar__icon {
  color: var(--n-accent);
}
</style>
