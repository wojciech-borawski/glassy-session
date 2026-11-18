<script setup lang="ts">
import NField from '../n-field/index.vue'

defineProps<{
  label: string
  hideLabel?: boolean
  placeholder?: string
  error?: string
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <NField v-slot="{ describedBy, invalid }" :label="label" :hide-label="hideLabel" :error="error">
    <input
      class="n-field__control"
      :placeholder="placeholder"
      :value="modelValue"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </NField>
</template>
