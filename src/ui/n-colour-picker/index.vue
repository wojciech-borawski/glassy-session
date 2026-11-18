<script setup lang="ts">
import { colourNames, colourValues, type ColourName } from '../colours'

defineProps<{
  label: string
  modelValue: ColourName
}>()

const emit = defineEmits<{
  'update:modelValue': [colour: ColourName]
}>()

const { t } = useI18n()
const labelId = useId()
const groupName = useId()
</script>

<template>
  <div class="n-colour-picker">
    <span :id="labelId" class="n-colour-picker__label">{{ label }}</span>
    <div class="n-colour-picker__colours" role="radiogroup" :aria-labelledby="labelId">
      <input
        v-for="colour in colourNames"
        :key="colour"
        class="n-colour-picker__colour"
        type="radio"
        :name="groupName"
        :value="colour"
        :checked="colour === modelValue"
        :aria-label="t(`colour.${colour}`)"
        :style="{ backgroundColor: colourValues[colour] }"
        @change="emit('update:modelValue', colour)"
      >
    </div>
  </div>
</template>

<style scoped>
.n-colour-picker {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.n-colour-picker__colours {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px;
}

.n-colour-picker__colour {
  appearance: none;
  width: 26px;
  height: 26px;
  margin: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.n-colour-picker__colour:checked {
  outline: 2px solid var(--n-text);
  outline-offset: 2px;
}

.n-colour-picker__colour:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 3px;
}
</style>
