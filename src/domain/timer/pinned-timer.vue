<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NListRow from '@/ui/n-list-row/index.vue'
import NSwatch from '@/ui/n-swatch/index.vue'
import { formatCountdown } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import { remainingTimeAt, runStateAt, type Timer } from './model/timer'

const props = defineProps<{
  timer: Timer
  now: Moment
  /** The name of the focus session whose run uses the task, which alone starts it while that run goes on. */
  inSession?: string
}>()

const emit = defineEmits<{
  start: []
  pause: []
}>()

const { t } = useI18n()
const nameId = useId()

const remainingTime = computed(() => remainingTimeAt(props.timer, props.now))
const runState = computed(() => runStateAt(props.timer, props.now))
const finishedKey = computed(() => props.timer.repeatDays === undefined ? props.timer.kind : 'repeatingTask')
</script>

<template>
  <NListRow :running="runState === 'running'" :aria-labelledby="nameId">
    <NSwatch :colour="timer.appearance.colour" size="dot" />
    <b :id="nameId" class="pinned-timer__name">{{ timer.name }}</b>
    <template v-if="runState === 'finished'">
      <span class="pinned-timer__finished">{{ t(`timer.finished.${finishedKey}`) }}</span>
    </template>
    <template v-else>
      <span class="pinned-timer__remaining">{{ formatCountdown(remainingTime) }}</span>
      <slot name="sound" />
      <span v-if="inSession !== undefined" class="pinned-timer__in-session">{{ t('timer.inSession', { name: inSession }) }}</span>
      <NButton v-else-if="runState === 'running'" icon="pause" :label="t('timer.action.pause', { name: timer.name })" @click="emit('pause')" />
      <NButton v-else icon="play" :label="t('timer.action.start', { name: timer.name })" @click="emit('start')" />
    </template>
  </NListRow>
</template>

<style scoped>
.pinned-timer__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-timer__remaining {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}

.pinned-timer__finished,
.pinned-timer__in-session {
  padding-inline-end: 6px;
  color: var(--n-text-muted);
  font-size: 11.5px;
}
</style>
