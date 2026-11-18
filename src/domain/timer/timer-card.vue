<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NCard from '@/ui/n-card/index.vue'
import NProgressBar from '@/ui/n-progress-bar/index.vue'
import NSwatch from '@/ui/n-swatch/index.vue'
import NTag from '@/ui/n-tag/index.vue'
import { weekdayNames, weekFromMonday } from '@/ui/weekdays'
import { formatCountdown, formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import type { RepeatDayResult } from '../tracking/model/repeat-day-results'
import { isPinned, remainingTimeAt, runStateAt, type Timer } from './model/timer'

const props = defineProps<{
  timer: Timer
  now: Moment
  /** The name of the focus session whose run uses the task, which alone starts and marks it done while that run goes on, so the card offers no Start, Reset, Mark done or Undo done. */
  inSession?: string
  /** How the repeat day before today went, for a repeating task on one of its repeat days. */
  lastTime?: RepeatDayResult
}>()

defineEmits<{
  start: []
  pause: []
  reset: []
  markDone: []
  undoDone: []
  edit: []
  pin: []
  unpin: []
  statistics: []
}>()

const { t, locale } = useI18n()
const nameId = useId()

const initial = computed(() => props.timer.name.trim().charAt(0).toUpperCase())
const remainingTime = computed(() => remainingTimeAt(props.timer, props.now))
const runState = computed(() => runStateAt(props.timer, props.now))
const used = computed(() => 1 - remainingTime.value / props.timer.plannedTime)
const finishedKey = computed(() => props.timer.repeatDays === undefined ? props.timer.kind : 'repeatingTask')
const repeatsOn = (day: number) => props.timer.repeatDays?.some((repeatDay) => repeatDay === day) ?? false
const repeatDayNames = computed(() => new Intl.ListFormat(locale.value).format((props.timer.repeatDays ?? []).map((day) => t(`weekday.${weekdayNames[day]}.name`))))
</script>

<template>
  <NCard as="article" class="timer-card" :greyed="runState === 'finished'" :aria-labelledby="nameId">
    <template #header>
      <NSwatch :colour="timer.appearance.colour" :initial="initial" />
      <div class="timer-card__title">
        <b :id="nameId" class="timer-card__name">{{ timer.name }}</b>
        <span><NTag>{{ t(`timer.kind.${timer.kind}`) }}</NTag></span>
      </div>
      <NButton v-if="timer.kind === 'task'" icon="chart" :label="t('timer.action.statistics', { name: timer.name })" @click="$emit('statistics')" />
      <NButton icon="pin" :pressed="isPinned(timer)" :label="t('timer.action.pin', { name: timer.name })" @click="isPinned(timer) ? $emit('unpin') : $emit('pin')" />
    </template>
    <p v-if="timer.description" class="timer-card__note">{{ timer.description }}</p>
    <p class="timer-card__remaining">{{ runState === 'finished' ? t(`timer.finished.${finishedKey}`) : formatCountdown(remainingTime) }}</p>
    <p v-if="inSession !== undefined" class="timer-card__note">{{ t('timer.inSession', { name: inSession }) }}</p>
    <p class="timer-card__note">{{ t('timer.plannedOf', { planned: formatHoursAndMinutes(timer.plannedTime) }) }}</p>
    <p v-if="lastTime !== undefined && runState === 'idle'" class="timer-card__note">{{ lastTime.finished ? t('timer.lastTimeFinished') : t('timer.lastTime', { tracked: formatHoursAndMinutes(lastTime.tracked), planned: formatHoursAndMinutes(lastTime.planned) }) }}</p>
    <p v-if="timer.repeatDays" class="timer-card__repeat" role="img" :aria-label="t('timer.repeatsOn', { days: repeatDayNames })">
      <span
        v-for="day in weekFromMonday"
        :key="day"
        class="timer-card__day"
        :class="{ 'timer-card__day--repeats': repeatsOn(day) }"
        aria-hidden="true"
      >{{ t(`weekday.${weekdayNames[day]}.letter`) }}</span>
    </p>
    <NProgressBar :label="t('timer.progress', { name: timer.name })" :value="used" />
    <slot name="sound" />
    <template #footer>
      <NButton v-if="runState === 'running'" variant="primary" icon="pause" :label="t('timer.action.pause', { name: timer.name })" @click="$emit('pause')">{{ t('timer.action.pauseShort') }}</NButton>
      <NButton v-else-if="runState !== 'finished' && inSession === undefined" variant="primary" icon="play" :label="t('timer.action.start', { name: timer.name })" @click="$emit('start')">{{ t('timer.action.startShort') }}</NButton>
      <NButton v-if="timer.kind === 'task' && runState === 'finished' && inSession === undefined" :label="t('timer.action.undoDone', { name: timer.name })" @click="$emit('undoDone')">{{ t('timer.action.undoDoneShort') }}</NButton>
      <NButton v-else-if="runState !== 'idle' && inSession === undefined" :label="t('timer.action.reset', { name: timer.name })" @click="$emit('reset')">{{ t('timer.action.resetShort') }}</NButton>
      <NButton v-if="timer.kind === 'task' && runState !== 'finished' && inSession === undefined" icon="check" :label="t('timer.action.markDone', { name: timer.name })" @click="$emit('markDone')" />
      <NButton icon="pencil" :label="t('timer.action.edit', { name: timer.name })" @click="$emit('edit')" />
    </template>
  </NCard>
</template>

<style scoped>
.timer-card__title {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.timer-card__name {
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timer-card__remaining {
  margin: 0;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
  line-height: 1.1;
}

.timer-card__repeat {
  display: flex;
  gap: 2px;
  margin: 0;
}

.timer-card__day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--n-surface-soft);
  color: var(--n-text-muted);
  font-size: 9.5px;
}

.timer-card__day--repeats {
  background: var(--n-accent);
  color: var(--n-on-accent);
}

.timer-card__note {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}
</style>
