<script setup lang="ts">
import NField from '../n-field/index.vue'
import NIcon from '../n-icon/index.vue'

defineProps<{
  label: string
  hideLabel?: boolean
  options: readonly { value: string, label: string }[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <NField :label="label" :hide-label="hideLabel">
    <span class="n-select">
      <select
        class="n-field__control n-select__control"
        :value="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <NIcon class="n-select__chevron" name="chevron-down" :size="12" />
    </span>
  </NField>
</template>

<style scoped>
.n-select {
  position: relative;
  display: flex;
}

.n-select__control {
  appearance: none;
  padding-right: 30px;
  cursor: pointer;
}

.n-select__chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  color: var(--n-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
