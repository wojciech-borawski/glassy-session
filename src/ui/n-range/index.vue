<script setup lang="ts">
import NField from '../n-field/index.vue'

defineProps<{
  label: string
  hideLabel?: boolean
  modelValue: number
  min: number
  max: number
  step: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <NField :label="label" :hide-label="hideLabel">
    <input
      class="n-range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).valueAsNumber)"
    >
  </NField>
</template>

<style scoped>
.n-range {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  accent-color: var(--n-accent);
}

.n-range:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}
</style>
