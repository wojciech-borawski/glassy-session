<script setup lang="ts">
import NButton from '../n-button/index.vue'
import { weekdayNames, weekFromMonday } from '../weekdays'

const props = defineProps<{
  label: string
  modelValue: readonly number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [days: number[]]
}>()

const { t } = useI18n()

function toggle(day: number) {
  const days = props.modelValue.includes(day)
    ? props.modelValue.filter(chosen => chosen !== day)
    : [...props.modelValue, day]
  emit('update:modelValue', days.sort((a, b) => a - b))
}
</script>

<template>
  <fieldset class="n-day-picker">
    <legend class="n-day-picker__label">{{ label }}</legend>
    <div class="n-day-picker__days">
      <NButton
        v-for="day in weekFromMonday"
        :key="day"
        class="n-day-picker__day"
        :label="t(`weekday.${weekdayNames[day]}.name`)"
        :pressed="modelValue.includes(day)"
        @click="toggle(day)"
      >
        {{ t(`weekday.${weekdayNames[day]}.letter`) }}
      </NButton>
    </div>
  </fieldset>
</template>

<style scoped>
.n-day-picker {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.n-day-picker__label {
  margin-bottom: 3px;
  padding: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.n-day-picker__days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.n-day-picker__days .n-day-picker__day {
  width: 30px;
  padding-inline: 0;
}
</style>
