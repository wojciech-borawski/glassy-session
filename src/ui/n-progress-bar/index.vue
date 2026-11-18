<script setup lang="ts">
import { percentOf } from '../fraction'

const props = defineProps<{
  label: string
  value: number
}>()

const percent = computed(() => percentOf(props.value))
</script>

<template>
  <div class="n-progress-bar" role="progressbar" :aria-label="label" :aria-valuenow="percent">
    <div class="n-progress-bar__fill" :style="{ width: `${percent}%` }" />
  </div>
</template>

<style scoped>
.n-progress-bar {
  height: 5px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--n-track);
}

.n-progress-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: var(--n-progress-fill);
}
</style>
