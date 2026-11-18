<script setup lang="ts">
import NCard from '@/ui/n-card/index.vue'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Timer } from '../timer/model/timer'
import type { TaskTotal } from './model/statistics'
import { colourOfTask } from './task-colour'

defineProps<{
  tasks: readonly TaskTotal[]
  timers: readonly Timer[]
}>()

const { t } = useI18n()
const headingId = useId()
</script>

<template>
  <NCard class="task-totals">
    <h3 :id="headingId" class="task-totals__heading">{{ t('taskTotals.heading') }}</h3>
    <p v-if="tasks.length === 0" class="task-totals__nothing">{{ t('taskTotals.nothingTracked') }}</p>
    <ul v-else class="task-totals__list" :aria-labelledby="headingId">
      <li v-for="task in tasks" :key="task.taskId" class="task-totals__task">
        <span class="task-totals__dot" :style="{ backgroundColor: colourOfTask(task.taskId, timers) }" aria-hidden="true" />
        <span class="task-totals__name" :class="{ 'task-totals__name--removed': task.name === null }">{{ task.name ?? t('taskTotals.removedTask') }}</span> <span class="task-totals__tracked">{{ formatHoursAndMinutes(task.tracked) }}</span>
      </li>
    </ul>
  </NCard>
</template>

<style scoped>
.task-totals__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
  font-weight: var(--n-font-weight-strong);
}

.task-totals__nothing {
  margin: 0;
  color: var(--n-text-muted);
}

.task-totals__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-totals__task {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-totals__dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.task-totals__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-totals__name--removed {
  color: var(--n-text-muted);
  font-style: italic;
}

.task-totals__tracked {
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}
</style>
