<script setup lang="ts">
import NField from '../n-field/index.vue'

const props = defineProps<{
  label: string
  modelValue: number
  min?: number
  max?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function report(event: Event) {
  const typed = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isNaN(typed)) return
  emit('update:modelValue', Math.min(Math.max(typed, props.min ?? -Infinity), props.max ?? Infinity))
}
</script>

<template>
  <NField :label="label">
    <input
      class="n-field__control"
      type="number"
      :min="min"
      :max="max"
      :value="modelValue"
      @input="report"
    >
  </NField>
</template>
