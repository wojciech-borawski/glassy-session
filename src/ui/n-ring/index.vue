<script setup lang="ts">
import { clampFraction, percentOf } from '../fraction'

const props = withDefaults(defineProps<{
  label: string
  value: number
  size?: number
}>(), {
  size: 128
})

const strokeWidth = 7
const centre = computed(() => props.size / 2)
const radius = computed(() => centre.value - strokeWidth)
const circumference = computed(() => 2 * Math.PI * radius.value)
const gap = computed(() => circumference.value * (1 - clampFraction(props.value)))
</script>

<template>
  <div
    class="n-ring"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="percentOf(value)"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg :width="size" :height="size" aria-hidden="true">
      <circle
        class="n-ring__track"
        :cx="centre"
        :cy="centre"
        :r="radius"
        :stroke-width="strokeWidth"
      />
      <circle
        class="n-ring__arc"
        :cx="centre"
        :cy="centre"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="gap"
        :transform="`rotate(-90 ${centre} ${centre})`"
      />
    </svg>
    <div class="n-ring__centre">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.n-ring {
  position: relative;
  flex: none;
}

.n-ring__track,
.n-ring__arc {
  fill: none;
}

.n-ring__track {
  stroke: var(--n-track);
}

.n-ring__arc {
  stroke: var(--n-accent);
  stroke-linecap: round;
}

.n-ring__centre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
