<script setup lang="ts">
const props = defineProps<{
  label: string
  bars: readonly { key: string, label: string, total: string, description: string, current?: boolean, parts: readonly { value: number, colour: string }[] }[]
}>()

const tallest = computed(() => Math.max(0, ...props.bars.map(bar => bar.parts.reduce((sum, part) => sum + part.value, 0))))

function heightOf(value: number): string {
  return `${value / tallest.value * 100}%`
}
</script>

<template>
  <ul class="n-stacked-bar-chart" :aria-label="label">
    <li
      v-for="bar in bars"
      :key="bar.key"
      class="n-stacked-bar-chart__bar"
      :class="{ 'n-stacked-bar-chart__bar--current': bar.current }"
      :aria-current="bar.current ? 'true' : undefined"
    >
      <span class="n-stacked-bar-chart__description">{{ bar.description }}</span>
      <span class="n-stacked-bar-chart__total" aria-hidden="true">{{ bar.total }}</span>
      <div class="n-stacked-bar-chart__track" aria-hidden="true">
        <div
          v-for="(part, index) in bar.parts"
          :key="index"
          class="n-stacked-bar-chart__part"
          :style="{ height: heightOf(part.value), backgroundColor: part.colour }"
        />
      </div>
      <span class="n-stacked-bar-chart__label" aria-hidden="true">{{ bar.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.n-stacked-bar-chart {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.n-stacked-bar-chart__bar {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.n-stacked-bar-chart__description {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.n-stacked-bar-chart__total {
  color: var(--n-text-muted);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.n-stacked-bar-chart__track {
  display: flex;
  flex-direction: column-reverse;
  width: min(100%, 30px);
  height: 120px;
  overflow: hidden;
  border-radius: calc(var(--n-radius) * .5 + 2px);
  background: var(--n-track);
}

.n-stacked-bar-chart__part {
  flex: none;
}

.n-stacked-bar-chart__label {
  color: var(--n-text-muted);
  font-size: 11px;
}

.n-stacked-bar-chart__bar--current .n-stacked-bar-chart__total,
.n-stacked-bar-chart__bar--current .n-stacked-bar-chart__label {
  color: var(--n-text);
  font-weight: var(--n-font-weight-strong);
}
</style>
