<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import type { Timer } from '../timer/model/timer'
import type { FilterChoice, TaskFilter } from './model/statistics'
import { colourOfTask } from './task-colour'

const props = defineProps<{
  choices: readonly FilterChoice[]
  modelValue: TaskFilter
  timers: readonly Timer[]
}>()

const emit = defineEmits<{
  'update:modelValue': [filter: TaskFilter]
}>()

const { t } = useI18n()

const removedIds = computed(() => props.choices.filter(({ name }) => name === null).map(({ taskId }) => taskId))
const labelOf = ({ taskId, name }: FilterChoice) => {
  if (name !== null) {
    return name
  }
  return removedIds.value.length > 1 ? t('taskFilter.removedTaskNumbered', { number: removedIds.value.indexOf(taskId) + 1 }) : t('taskFilter.removedTask')
}
const labelled = computed(() => props.choices.map((choice) => ({ ...choice, label: labelOf(choice) })))

function toggle(taskId: string) {
  const chosen = props.modelValue.includes(taskId)
  emit('update:modelValue', chosen ? props.modelValue.filter((id) => id !== taskId) : [...props.modelValue, taskId])
}
</script>

<template>
  <div class="task-filter" role="group" :aria-label="t('taskFilter.label')">
    <NButton :pressed="modelValue.length === 0" @click="emit('update:modelValue', [])">{{ t('taskFilter.all') }}</NButton>
    <NButton v-for="choice in labelled" :key="choice.taskId" :pressed="modelValue.includes(choice.taskId)" @click="toggle(choice.taskId)">
      <span class="task-filter__dot" :style="{ backgroundColor: colourOfTask(choice.taskId, timers) }" aria-hidden="true" />
      <span :class="{ 'task-filter__removed': choice.name === null }">{{ choice.label }}</span>
    </NButton>
  </div>
</template>

<style scoped>
.task-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-filter__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.task-filter__removed {
  font-style: italic;
}
</style>
