<script setup lang="ts">
import { percentOf } from '../fraction'

const props = defineProps<{
  label: string
  segments: readonly { length: number, fill: number, color: string }[]
}>()

const percent = computed(() => {
  const whole = props.segments.reduce((sum, segment) => sum + segment.length, 0)
  const filled = props.segments.reduce((sum, segment) => sum + segment.length * segment.fill, 0)
  return whole === 0 ? 0 : percentOf(filled / whole)
})
</script>

<template>
  <div class="n-progress-line" role="progressbar" :aria-label="label" :aria-valuenow="percent">
    <div
      v-for="(segment, index) in segments"
      :key="index"
      class="n-progress-line__segment"
      :style="{ flexGrow: segment.length, '--n-segment-color': segment.color }"
    >
      <div class="n-progress-line__fill" :style="{ width: `${percentOf(segment.fill)}%` }" />
    </div>
  </div>
</template>

<style scoped>
.n-progress-line {
  display: flex;
  gap: 2px;
  height: 9px;
}

.n-progress-line__segment {
  flex-basis: 0;
  min-width: 2px;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--n-segment-color) 30%, transparent);
}

.n-progress-line__fill {
  height: 100%;
  background: var(--n-segment-color);
}
</style>
