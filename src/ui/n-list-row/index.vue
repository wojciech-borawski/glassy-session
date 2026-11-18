<script setup lang="ts">
defineProps<{
  running?: boolean
  /** Draws the running marks in the theme's calm colour, without the sheen, for something that runs at rest. */
  calm?: boolean
}>()
</script>

<template>
  <li class="n-list-row" :class="{ 'n-list-row--running': running, 'n-list-row--calm': calm }">
    <slot />
  </li>
</template>

<style scoped>
.n-list-row {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 3px 4px 3px 10px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius);
  background: var(--n-surface);
  box-shadow: var(--n-shadow);
}

.n-list-row--running {
  --n-list-row-mark: var(--n-accent);
  border-color: color-mix(in srgb, var(--n-list-row-mark) 30%, transparent);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--n-list-row-mark) 12%, transparent), color-mix(in srgb, var(--n-list-row-mark) 3%, transparent) 60%),
    var(--n-surface);
}

.n-list-row--running.n-list-row--calm {
  --n-list-row-mark: var(--n-calm);
}

.n-list-row--running::before,
.n-list-row--running::after {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.n-list-row--running::before {
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--n-accent) 16%, transparent) 50%, transparent 70%) 150% 0 / 250% 100% no-repeat;
  animation: n-list-row-sheen 12s ease-in-out infinite;
}

.n-list-row--running::after {
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--n-list-row-mark);
}

@keyframes n-list-row-sheen {
  0% {
    background-position: 150% 0;
  }

  33%,
  100% {
    background-position: -60% 0;
  }
}

.n-list-row--calm::before {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .n-list-row--running::before {
    animation: none;
  }
}
</style>
