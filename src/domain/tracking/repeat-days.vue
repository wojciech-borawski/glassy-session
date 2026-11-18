<script setup lang="ts">
import NCard from '@/ui/n-card/index.vue'
import { formatDay } from '@/utils/time/format-day'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { TaskRepeatDays } from './model/statistics'

defineProps<{
  tasks: readonly TaskRepeatDays[]
}>()

const { t, locale } = useI18n()
const headingId = useId()
const taskId = useId()
</script>

<template>
  <NCard v-if="tasks.length > 0" class="repeat-days">
    <h3 :id="headingId" class="repeat-days__heading">{{ t('repeatDays.heading') }}</h3>
    <ul class="repeat-days__tasks" :aria-labelledby="headingId">
      <li v-for="task in tasks" :key="task.taskId" class="repeat-days__task">
        <span :id="`${taskId}-${task.taskId}`" class="repeat-days__count" :class="{ 'repeat-days__count--removed': task.name === null }">
          {{ t('repeatDays.finishedOf', { name: task.name ?? t('taskTotals.removedTask'), finished: task.finished, count: task.days.length }) }}
        </span>
        <ul class="repeat-days__days" :aria-labelledby="`${taskId}-${task.taskId}`">
          <li v-for="result in task.days" :key="result.day" class="repeat-days__day" :class="{ 'repeat-days__day--finished': result.finished }">
            {{ t('repeatDays.day', {
              day: formatDay(result.day, locale, { weekday: 'short', month: 'short', day: 'numeric' }),
              tracked: formatHoursAndMinutes(result.tracked),
              planned: formatHoursAndMinutes(result.planned),
              result: t(result.finished ? 'repeatDays.finished' : 'repeatDays.unfinished')
            }) }}
          </li>
        </ul>
      </li>
    </ul>
  </NCard>
</template>

<style scoped>
.repeat-days__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
  font-weight: var(--n-font-weight-strong);
}

.repeat-days__tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.repeat-days__task {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.repeat-days__count--removed {
  font-style: italic;
}

.repeat-days__days {
  margin: 0;
  padding: 0 0 0 12px;
  list-style: none;
  color: var(--n-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.repeat-days__day--finished {
  color: var(--n-text);
}
</style>
