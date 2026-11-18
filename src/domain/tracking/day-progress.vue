<script setup lang="ts">
import NCard from '@/ui/n-card/index.vue'
import NProgressBar from '@/ui/n-progress-bar/index.vue'
import type { Day } from '@/utils/time/calendar'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Timer } from '../timer/model/timer'
import { dayProgressOf } from './model/statistics'
import type { TrackedTime } from './model/tracked-time'

const props = defineProps<{
  trackedTime: TrackedTime
  timers: readonly Timer[]
  today: Day
}>()

const { t } = useI18n()
const headingId = useId()

const tasks = computed(() => props.timers
  .filter(timer => timer.kind === 'task')
  .map(task => ({ task, progress: dayProgressOf(props.trackedTime, task, props.today) })))
</script>

<template>
  <NCard v-if="tasks.length > 0" class="day-progress">
    <h3 :id="headingId" class="day-progress__heading">{{ t('dayProgress.heading') }}</h3>
    <ul class="day-progress__list" :aria-labelledby="headingId">
      <li v-for="{ task, progress } in tasks" :key="task.id" class="day-progress__task">
        <span class="day-progress__line">
          <span class="day-progress__name">{{ task.name }}</span> <span class="day-progress__tracked">{{ t('dayProgress.trackedOf', { tracked: formatHoursAndMinutes(progress.tracked), planned: formatHoursAndMinutes(progress.planned) }) }}</span>
        </span>
        <NProgressBar :label="t('dayProgress.progress', { name: task.name })" :value="progress.fraction" />
      </li>
    </ul>
  </NCard>
</template>

<style scoped>
.day-progress__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
  font-weight: var(--n-font-weight-strong);
}

.day-progress__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.day-progress__task {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-progress__line {
  display: flex;
  gap: 8px;
}

.day-progress__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-progress__tracked {
  color: var(--n-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
