<script setup lang="ts">
import { icons, type IconName } from './icons'

withDefaults(defineProps<{
  name: IconName
  size?: number
}>(), {
  size: 16
})
</script>

<template>
  <svg
    class="n-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="icons[name]" />
  </svg>
</template>

<style scoped>
.n-icon {
  flex: none;
}
</style>
