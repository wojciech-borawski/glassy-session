<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NRing from '@/ui/n-ring/index.vue'
import { formatClockTime } from '@/utils/time/format-clock-time'
import { formatCountdown } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import type { Timer } from '../timer/model/timer'
import { isPinned, progressAt, taskTimesAt, tasksInRun, upNextAt, type FocusSession } from './model/focus-session'
import SessionProgressLine from './session-progress-line.vue'
import SessionRunActions from './session-run-actions.vue'
import SessionStatus from './session-status.vue'
import UpNext from './up-next.vue'

const props = defineProps<{
  session: FocusSession
  tasks: readonly Timer[]
  now: Moment
}>()

defineEmits<{
  pause: []
  resume: []
  skip: []
  endEarly: []
  moveStep: [from: number, to: number]
  sendToFront: [step: number]
  addTaskSteps: [task: Timer]
  markTaskDone: [task: Timer]
  pin: []
  unpin: []
}>()

const { t } = useI18n()
const nameId = useId()

const progress = computed(() => progressAt(props.session, props.now))
/** Whether the session is in a focus step or a break, running or paused. */
const running = computed(() => progress.value.state !== 'idle' && progress.value.state !== 'finished')
const part = computed(() => {
  const { state } = progress.value
  if (state === 'paused') {
    return t('focusSessionDetail.part.paused')
  }
  return state === 'break' ? t('focusSessionDetail.part.break') : t('focusSessionDetail.part.focusStep')
})
const partDone = computed(() => {
  const { remainingTime, partLength } = progress.value
  return remainingTime === null || partLength === null || partLength === 0 ? 0 : 1 - remainingTime / partLength
})
const upNext = computed(() => upNextAt(props.session, props.now))
/** Tasks with time left that the run does not have yet, whose steps can join it. */
const addable = computed(() => {
  const inRun = tasksInRun(props.session)
  const withTimeLeft = new Set(taskTimesAt(props.tasks, props.now).filter(({ remainingTime }) => remainingTime > 0).map(({ taskId }) => taskId))
  return props.tasks.filter(({ id }) => withTimeLeft.has(id) && !inRun.has(id))
})
/** The task of the current focus step, running or paused, which can be marked done from beside that step. None in a break. */
const focusStepTask = computed(() => {
  const now = progress.value
  const inFocusStep = now.state === 'focus step' || (now.state === 'paused' && now.pausedIn === 'focus step')
  const taskId = inFocusStep && now.currentStep !== null ? props.session.run?.plan[now.currentStep]?.taskId : undefined
  return props.tasks.find(({ id }) => id === taskId)
})
const stepOf = computed(() => t('focusSessionDetail.stepOf', {
  step: (progress.value.currentStep ?? 0) + 1,
  steps: props.session.run?.plan.length ?? 0
}))
</script>

<template>
  <section class="focus-session-detail" :aria-labelledby="nameId">
    <header class="focus-session-detail__header">
      <h2 :id="nameId" class="focus-session-detail__name">{{ session.name }}</h2>
      <NButton v-if="running" icon="pin" :pressed="isPinned(session)" :label="t('focusSession.action.pin', { name: session.name })" @click="isPinned(session) ? $emit('unpin') : $emit('pin')" />
    </header>
    <template v-if="running">
      <NRing class="focus-session-detail__ring" :label="part" :value="partDone">
        <span class="focus-session-detail__time">{{ formatCountdown(progress.remainingTime ?? 0) }}</span>
        <span class="focus-session-detail__part">{{ part }}</span>
      </NRing>
      <div class="focus-session-detail__current">
        <p class="focus-session-detail__step">{{ stepOf }}</p>
        <NButton v-if="focusStepTask" icon="check" :label="t('focusSessionDetail.markDone', { task: focusStepTask.name })" @click="$emit('markTaskDone', focusStepTask)" />
      </div>
      <slot name="sound" />
      <SessionStatus :session="session" :tasks="tasks" :now="now" />
    </template>
    <p v-else-if="progress.estimatedEnd !== null" class="focus-session-detail__step">{{ t('focusSession.finishedAt', { time: formatClockTime(progress.estimatedEnd) }) }}</p>
    <SessionProgressLine :label="t('focusSessionCard.progress', { name: session.name })" :progress-line="progress.progressLine" :tasks="tasks" />
    <template v-if="running">
      <div class="focus-session-detail__actions">
        <SessionRunActions :name="session.name" :progress="progress" @pause="$emit('pause')" @resume="$emit('resume')" @skip="$emit('skip')" @end-early="$emit('endEarly')" />
      </div>
      <h3 class="focus-session-detail__heading">{{ t('upNext.label') }}</h3>
      <UpNext :steps="upNext" :tasks="tasks" :addable="addable" @move="(from, to) => $emit('moveStep', from, to)" @send-to-front="(step) => $emit('sendToFront', step)" @add="(task) => $emit('addTaskSteps', task)" @mark-done="(task) => $emit('markTaskDone', task)" />
    </template>
  </section>
</template>

<style scoped>
.focus-session-detail {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.focus-session-detail__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus-session-detail__name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: var(--n-font-weight-strong);
  overflow-wrap: anywhere;
}

.focus-session-detail__heading {
  margin: 4px 0 0;
  font-size: 12.5px;
  font-weight: var(--n-font-weight-strong);
}

.focus-session-detail__ring {
  align-self: center;
}

.focus-session-detail__time {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}

.focus-session-detail__current {
  display: flex;
  align-items: center;
  gap: 6px;
}

.focus-session-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.focus-session-detail__part,
.focus-session-detail__step {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}
</style>
