<script setup lang="ts">
import NCard from '@/ui/n-card/index.vue'
import NStackedBarChart from '@/ui/n-stacked-bar-chart/index.vue'
import type { Day } from '@/utils/time/calendar'
import { formatDay } from '@/utils/time/format-day'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Timer } from '../timer/model/timer'
import type { Totals } from './model/statistics'
import { colourOfTask } from './task-colour'

const props = defineProps<{
  totals: Totals
  timers: readonly Timer[]
  today: Day
}>()

const { t, locale } = useI18n()

const bars = computed(() => props.totals.days.map(({ day, tracked, tasks }) => {
  const dayName = formatDay(day, locale.value, { weekday: 'long', month: 'long', day: 'numeric' })
  return {
    key: day,
    label: formatDay(day, locale.value, { weekday: 'short' }),
    total: formatHoursAndMinutes(tracked),
    current: day === props.today,
    description: tracked === 0 ? t('weekChart.nothingOn', { day: dayName }) : t('weekChart.day', { day: dayName, tracked: formatHoursAndMinutes(tracked) }),
    parts: tasks.map(task => ({ value: task.tracked, colour: colourOfTask(task.taskId, props.timers) }))
  }
}))
</script>

<template>
  <NCard class="week-chart">
    <p class="week-chart__total">
      <span class="week-chart__total-label">{{ t('weekChart.weekTotal') }}</span>
      <span class="week-chart__total-value">{{ formatHoursAndMinutes(totals.tracked) }}</span>
    </p>
    <NStackedBarChart :label="t('weekChart.label')" :bars="bars" />
  </NCard>
</template>

<style scoped>
.week-chart {
  gap: 12px;
}

.week-chart__total {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.week-chart__total-label {
  color: var(--n-text-muted);
  font-size: 12px;
}

.week-chart__total-value {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}
</style>
