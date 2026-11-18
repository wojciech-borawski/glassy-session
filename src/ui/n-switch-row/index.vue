<script setup lang="ts">
import NSwitch from '../n-switch/index.vue'

defineProps<{
  label: string
  hint: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [on: boolean]
}>()

const hintId = useId()
</script>

<template>
  <div class="n-switch-row">
    <div class="n-switch-row__text">
      <span>{{ label }}</span>
      <span :id="hintId" class="n-switch-row__hint">{{ hint }}</span>
    </div>
    <NSwitch :label="label" :model-value="modelValue" :aria-describedby="hintId" @update:model-value="(on) => emit('update:modelValue', on)" />
  </div>
</template>

<style scoped>
.n-switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.n-switch-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.n-switch-row__hint {
  color: var(--n-text-muted);
  font-size: 11.5px;
}
</style>
