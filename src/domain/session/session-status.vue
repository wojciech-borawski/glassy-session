<script setup lang="ts">
import { formatClockTime } from '@/utils/time/format-clock-time'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import type { Timer } from '../timer/model/timer'
import { progressAt, type FocusSession } from './model/focus-session'
import SessionNowLine from './session-now-line.vue'

const props = defineProps<{
  session: FocusSession
  tasks: readonly Timer[]
  now: Moment
}>()

/** The least delay worth a line: half a minute, which rounds to one. */
const SHOWN_DELAY = 30_000

const { t } = useI18n()

const progress = computed(() => progressAt(props.session, props.now))
</script>

<template>
  <SessionNowLine :session="session" :tasks="tasks" :now="now" />
  <p v-if="progress.estimatedEnd !== null" class="session-status__note">{{ t('focusSession.endsAbout', { time: formatClockTime(progress.estimatedEnd) }) }}</p>
  <p v-if="progress.delay >= SHOWN_DELAY" class="session-status__delay">{{ t('focusSession.delay', { delay: formatHoursAndMinutes(progress.delay) }) }}</p>
</template>

<style scoped>
.session-status__delay {
  margin: 0;
  color: var(--n-warning);
  font-size: 11.5px;
  font-weight: 600;
}

.session-status__note {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}
</style>
