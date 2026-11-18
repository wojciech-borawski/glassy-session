<script setup lang="ts">
import type { Moment } from '@/utils/time/units'
import type { Named } from '../command/command-outcome'
import type { RepeatDayResult } from '../tracking/model/repeat-day-results'
import { runStateAt, type Timer } from './model/timer'
import TimerCard from './timer-card.vue'

const props = defineProps<{
  timers: readonly Timer[]
  now: Moment
  /** The focus session whose run uses each task, by task id. */
  usedInRun?: ReadonlyMap<string, Named>
  /** How the repeat day before today went, by task id, for each repeating task on one of its repeat days. */
  lastTimes?: ReadonlyMap<string, RepeatDayResult>
}>()

const emit = defineEmits<{
  start: [timer: Timer]
  pause: [timer: Timer]
  reset: [timer: Timer]
  markDone: [timer: Timer]
  undoDone: [timer: Timer]
  skipToday: [timer: Timer]
  edit: [timer: Timer]
  pin: [timer: Timer]
  unpin: [timer: Timer]
  statistics: [timer: Timer]
}>()

const { t } = useI18n()

const isFinished = (timer: Timer) => runStateAt(timer, props.now) === 'finished'
const groups = computed(() => [
  { key: 'left', heading: null, timers: props.timers.filter((timer) => !isFinished(timer)) },
  { key: 'finished', heading: t('timerList.finished'), timers: props.timers.filter(isFinished) }
].filter((group) => group.timers.length > 0))
</script>

<template>
  <p v-if="timers.length === 0" class="timer-list__empty">{{ t('timerList.empty') }}</p>
  <div v-else class="timer-list">
    <template v-for="group in groups" :key="group.key">
      <h3 v-if="group.heading" class="timer-list__heading">{{ group.heading }}</h3>
      <ul class="timer-list__cards">
        <li v-for="timer in group.timers" :key="timer.id">
          <TimerCard
            :timer="timer"
            :now="now"
            :in-session="usedInRun?.get(timer.id)?.name"
            :last-time="lastTimes?.get(timer.id)"
            @start="emit('start', timer)"
            @pause="emit('pause', timer)"
            @reset="emit('reset', timer)"
            @mark-done="emit('markDone', timer)"
            @undo-done="emit('undoDone', timer)"
            @skip-today="emit('skipToday', timer)"
            @edit="emit('edit', timer)"
            @pin="emit('pin', timer)"
            @unpin="emit('unpin', timer)"
            @statistics="emit('statistics', timer)"
          >
            <template #sound>
              <slot name="sound" :timer="timer" />
            </template>
          </TimerCard>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.timer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timer-list__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timer-list__empty {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}

.timer-list__heading {
  margin: 4px 0 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
