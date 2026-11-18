<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NCard from '@/ui/n-card/index.vue'
import NTag from '@/ui/n-tag/index.vue'
import { formatClockTime } from '@/utils/time/format-clock-time'
import { formatCountdown, formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import type { Timer } from '../timer/model/timer'
import { fittedPlanOf, isPinned, progressAt, taskTimesAt, type FocusSession } from './model/focus-session'
import SessionProgressLine from './session-progress-line.vue'
import SessionRunActions from './session-run-actions.vue'
import SessionStatus from './session-status.vue'

const props = defineProps<{
  session: FocusSession
  tasks: readonly Timer[]
  now: Moment
}>()

defineEmits<{
  start: []
  edit: []
  pause: []
  resume: []
  skip: []
  endEarly: []
  open: []
  pin: []
  unpin: []
}>()

const { t } = useI18n()
const nameId = useId()

const nameOf = (taskId: string | undefined) => props.tasks.find(({ id }) => id === taskId)?.name ?? ''
const taskNames = computed(() => props.session.taskIds.map(nameOf).filter((name) => name !== '').join(', '))
const progress = computed(() => progressAt(props.session, props.now))
const fitted = computed(() => fittedPlanOf(props.session, taskTimesAt(props.tasks, props.now)))
const stepsAndBreaks = computed(() => {
  const named = { step: formatHoursAndMinutes(props.session.stepLength), break: formatHoursAndMinutes(props.session.breakLength) }
  const key = props.session.breakLength > 0 ? 'focusSessionCard.stepsWithBreaks' : 'focusSessionCard.stepsWithNoBreaks'
  return t(key, named, fitted.value.focusSteps)
})
</script>

<template>
  <NCard as="article" class="focus-session-card" :aria-labelledby="nameId">
    <template #header>
      <div class="focus-session-card__title">
        <b :id="nameId" class="focus-session-card__name">{{ session.name }}</b>
        <span class="focus-session-card__note">{{ taskNames }}</span>
      </div>
      <NTag>{{ t('focusSessionCard.tag') }}</NTag>
      <NButton icon="pin" :pressed="isPinned(session)" :label="t('focusSession.action.pin', { name: session.name })" @click="isPinned(session) ? $emit('unpin') : $emit('pin')" />
    </template>
    <template v-if="progress.state === 'idle'">
      <template v-if="fitted.focusSteps > 0">
        <p class="focus-session-card__big">{{ formatHoursAndMinutes(fitted.length) }}</p>
        <p class="focus-session-card__note">{{ stepsAndBreaks }}</p>
      </template>
      <p v-else class="focus-session-card__note">{{ t('focusSessionCard.nothingLeft') }}</p>
      <SessionProgressLine :label="t('focusSessionCard.progress', { name: session.name })" :progress-line="fitted.progressLine" :tasks="tasks" />
    </template>
    <template v-else>
      <template v-if="progress.state === 'finished'">
        <p v-if="progress.estimatedEnd !== null" class="focus-session-card__note">{{ t('focusSession.finishedAt', { time: formatClockTime(progress.estimatedEnd) }) }}</p>
      </template>
      <template v-else>
        <p v-if="progress.remainingTime !== null" class="focus-session-card__big">{{ formatCountdown(progress.remainingTime) }}</p>
        <SessionStatus :session="session" :tasks="tasks" :now="now" />
      </template>
      <SessionProgressLine :label="t('focusSessionCard.progress', { name: session.name })" :progress-line="progress.progressLine" :tasks="tasks" />
    </template>
    <template v-if="progress.state === 'idle'" #footer>
      <NButton variant="primary" icon="play" :disabled="fitted.focusSteps === 0" :label="t('focusSession.action.start', { name: session.name })" @click="$emit('start')">{{ t('focusSession.action.startShort') }}</NButton>
      <NButton icon="pencil" :label="t('focusSession.action.edit', { name: session.name })" @click="$emit('edit')" />
    </template>
    <template v-else #footer>
      <SessionRunActions v-if="progress.state !== 'finished'" :name="session.name" :progress="progress" @pause="$emit('pause')" @resume="$emit('resume')" @skip="$emit('skip')" @end-early="$emit('endEarly')" />
      <NButton icon="chevron-right" :label="t('focusSession.action.open', { name: session.name })" @click="$emit('open')" />
    </template>
  </NCard>
</template>

<style scoped>
.focus-session-card__title {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.focus-session-card__name {
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-session-card__big {
  margin: 0;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
  line-height: 1.1;
}

.focus-session-card__note {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}
</style>
