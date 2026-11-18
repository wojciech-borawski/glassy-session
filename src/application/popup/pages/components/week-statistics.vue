<script setup lang="ts">
import { useStoredAsOfNow, useTrackingAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import DayProgress from '@/domain/tracking/day-progress.vue'
import { localDayOf } from '@/domain/tracking/local-day'
import { earliestTrackedDay, filterChoicesOf, isAvailable, MONDAY, narrowedTo, repeatDaysIn, totalsFor, weekAfter, weekBefore, weekOf, type DayRange, type TaskFilter as ChosenTasks } from '@/domain/tracking/model/statistics'
import RepeatDays from '@/domain/tracking/repeat-days.vue'
import TaskFilter from '@/domain/tracking/task-filter.vue'
import TaskTotals from '@/domain/tracking/task-totals.vue'
import WeekChart from '@/domain/tracking/week-chart.vue'
import WeekSwitcher from '@/domain/tracking/week-switcher.vue'

const props = defineProps<{
  /** The tasks the statistics is narrowed to, none for all tasks. */
  filter: ChosenTasks
}>()

defineEmits<{
  'update:filter': [filter: ChosenTasks]
}>()

const { t } = useI18n()
const tracking = useTrackingAsOfNow()
const trackedTime = computed(() => tracking.value.trackedTime)
const repeatDayResults = computed(() => tracking.value.repeatDayResults)
const asOfNow = useStoredAsOfNow()
const timers = computed(() => asOfNow.value.timers)
const now = useDisplayClock()

const today = computed(() => localDayOf(now.value).day)
const chosenWeek = shallowRef<DayRange | null>(null)
const week = computed(() => chosenWeek.value ?? weekOf(today.value, MONDAY))
const earliest = computed(() => earliestTrackedDay(trackedTime.value))
const canGoBack = computed(() => isAvailable(weekBefore(week.value), earliest.value, today.value))
const canGoForward = computed(() => isAvailable(weekAfter(week.value), earliest.value, today.value))
const tasks = computed(() => timers.value.filter(({ kind }) => kind === 'task'))
const choices = computed(() => filterChoicesOf(trackedTime.value, repeatDayResults.value, tasks.value))
const shownTrackedTime = computed(() => narrowedTo(trackedTime.value, props.filter))
const shownTasks = computed(() => props.filter.length === 0 ? tasks.value : tasks.value.filter(({ id }) => props.filter.includes(id)))
const totals = computed(() => totalsFor(shownTrackedTime.value, week.value, timers.value))
const repeatDays = computed(() => repeatDaysIn(narrowedTo(repeatDayResults.value, props.filter), week.value, tasks.value))
</script>

<template>
  <div class="week-statistics">
    <TaskFilter v-if="choices.length > 0" :choices="choices" :model-value="filter" :timers="timers" @update:model-value="$emit('update:filter', $event)" />
    <WeekSwitcher :week="week" :can-go-back="canGoBack" :can-go-forward="canGoForward" @back="chosenWeek = weekBefore(week)" @forward="chosenWeek = weekAfter(week)" />
    <p v-if="earliest === null" class="week-statistics__empty">{{ t('statistics.empty') }}</p>
    <template v-else>
      <WeekChart :totals="totals" :timers="timers" :today="today" />
      <TaskTotals :tasks="totals.tasks" :timers="timers" />
      <RepeatDays :tasks="repeatDays" />
      <DayProgress :tracked-time="shownTrackedTime" :timers="shownTasks" :today="today" />
    </template>
  </div>
</template>

<style scoped>
.week-statistics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week-statistics__empty {
  margin: 0;
  color: var(--n-text-muted);
}
</style>
