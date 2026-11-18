<script setup lang="ts">
import { colourValues, type ColourName } from '../colours'

withDefaults(defineProps<{
  colour: ColourName
  initial?: string
  size?: 'tile' | 'dot'
}>(), {
  initial: undefined,
  size: 'tile'
})
</script>

<template>
  <span
    class="n-swatch"
    :class="`n-swatch--${size}`"
    :style="{ backgroundColor: colourValues[colour] }"
    aria-hidden="true"
  >{{ size === 'tile' ? initial : undefined }}</span>
</template>

<style scoped>
.n-swatch {
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
}

.n-swatch--tile {
  width: 30px;
  height: 30px;
  border-radius: calc(var(--n-radius) * .6 + 3px);
}

.n-swatch--dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
</style>
