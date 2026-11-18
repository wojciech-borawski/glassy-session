<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NIcon from '@/ui/n-icon/index.vue'
import NListRow from '@/ui/n-list-row/index.vue'
import { formatCountdown, formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import type { Timer } from '../timer/model/timer'
import { fittedPlanOf, isCountingDownAt, isOnBreakAt, progressAt, taskTimesAt, type FocusSession } from './model/focus-session'
import SessionNowLine from './session-now-line.vue'

const props = defineProps<{
  session: FocusSession
  tasks: readonly Timer[]
  now: Moment
}>()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
}>()

const { t } = useI18n()
const nameId = useId()

const progress = computed(() => progressAt(props.session, props.now))
const fitted = computed(() => fittedPlanOf(props.session, taskTimesAt(props.tasks, props.now)))
const running = computed(() => isCountingDownAt(props.session, props.now))
const onBreak = computed(() => isOnBreakAt(props.session, props.now))
</script>

<template>
  <NListRow :running="running" :calm="onBreak" :aria-labelledby="nameId">
    <NIcon :name="onBreak ? 'cup' : 'target'" />
    <div class="pinned-session__text">
      <b :id="nameId" class="pinned-session__name">{{ session.name }}</b>
      <SessionNowLine v-if="progress.state !== 'idle' && progress.state !== 'finished'" :session="session" :tasks="tasks" :now="now" />
    </div>
    <template v-if="progress.state === 'idle'">
      <span class="pinned-session__remaining">{{ formatHoursAndMinutes(fitted.length) }}</span>
      <NButton icon="play" :disabled="fitted.focusSteps === 0" :label="t('focusSession.action.start', { name: session.name })" @click="emit('start')" />
    </template>
    <template v-else-if="progress.state !== 'finished'">
      <span v-if="progress.remainingTime !== null" class="pinned-session__remaining">{{ formatCountdown(progress.remainingTime) }}</span>
      <slot name="sound" />
      <NButton v-if="progress.state === 'paused'" icon="play" :label="t('focusSession.action.resume', { name: session.name })" @click="emit('resume')" />
      <NButton v-else icon="pause" :label="t('focusSession.action.pause', { name: session.name })" @click="emit('pause')" />
    </template>
  </NListRow>
</template>

<style scoped>
.pinned-session__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.pinned-session__name {
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-session__remaining {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}
</style>
