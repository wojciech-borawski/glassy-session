<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import SoundControls from '@/domain/music/sound-controls.vue'
import { useStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import OverlayPanel from '@/domain/overlay/overlay-panel.vue'
import { isCountingDownAt, isOnBreakAt, isPinned as isSessionPinned, progressAt } from '@/domain/session/model/focus-session'
import PinnedSession from '@/domain/session/pinned-session.vue'
import { useSessionCommands } from '@/domain/session/use-session-commands'
import { isPinned, remainingTimeAt, runStateAt } from '@/domain/timer/model/timer'
import PinnedTimer from '@/domain/timer/pinned-timer.vue'
import { useTimerCommands } from '@/domain/timer/use-timer-commands'
import NIcon from '@/ui/n-icon/index.vue'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import NSwatch from '@/ui/n-swatch/index.vue'

const asOfNow = useStoredAsOfNow()
const { settings, change } = useStoredOverlaySettings()
const now = useDisplayClock()
const timerCommands = useTimerCommands()
const sessionCommands = useSessionCommands()
const { messages } = useSnackbar()
const { t } = useI18n()

const pinnedTimers = computed(() => asOfNow.value.timers.filter(isPinned))
const pinnedSessions = computed(() => asOfNow.value.sessions.filter(isSessionPinned))
/** Where the overlay stays, from the overlay settings. */
const position = computed(() => ({ corner: settings.value.corner, offset: settings.value.offset }))
const count = computed(() => pinnedTimers.value.length + pinnedSessions.value.length)
const runningSessions = computed(() => pinnedSessions.value.filter((session) => isCountingDownAt(session, now.value)))
const runningTimers = computed(() => pinnedTimers.value.filter((timer) => runStateAt(timer, now.value) === 'running'))
const runningSession = computed(() => runningSessions.value[0])
const runningTimer = computed(() => runningTimers.value[0])
const runningOnBreak = computed(() => runningSession.value !== undefined && isOnBreakAt(runningSession.value, now.value))
/** The first running one in the panel's order, for the collapsed pill, with how many more are running. */
const running = computed(() => {
  const more = runningSessions.value.length + runningTimers.value.length - 1
  if (runningSession.value !== undefined) {
    const { name } = runningSession.value
    return { name: runningOnBreak.value ? t('overlay.runningOnBreak', { name }) : name, remainingTime: progressAt(runningSession.value, now.value).remainingTime ?? 0, more }
  }
  if (runningTimer.value !== undefined) {
    return { name: runningTimer.value.name, remainingTime: remainingTimeAt(runningTimer.value, now.value), more }
  }
  return null
})
</script>

<template>
  <OverlayPanel
    v-if="settings.shownOnPages && count > 0"
    :position="position"
    :collapsed="settings.collapsed"
    :count="count"
    :running="running"
    @collapse="change({ collapsed: true })"
    @expand="change({ collapsed: false })"
    @move="change"
  >
    <PinnedSession
      v-for="session in pinnedSessions"
      :key="session.id"
      :session="session"
      :tasks="asOfNow.timers"
      :now="now"
      @start="sessionCommands.start(session)"
      @pause="sessionCommands.pause(session)"
      @resume="sessionCommands.resume(session)"
    >
      <template #sound>
        <SoundControls :owner="{ of: 'focus session', id: session.id }" :name="session.name" size="compact" />
      </template>
    </PinnedSession>
    <PinnedTimer
      v-for="timer in pinnedTimers"
      :key="timer.id"
      :timer="timer"
      :now="now"
      :in-session="asOfNow.usedInRun.get(timer.id)?.name"
      @start="timerCommands.start(timer)"
      @pause="timerCommands.pause(timer)"
    >
      <template #sound>
        <SoundControls :owner="{ of: 'timer', id: timer.id }" :name="timer.name" size="compact" />
      </template>
    </PinnedTimer>
    <template #running-icon>
      <NIcon v-if="runningSession !== undefined" :name="runningOnBreak ? 'cup' : 'target'" :size="14" :class="{ 'pinned-overlay__break': runningOnBreak }" />
      <NSwatch v-else-if="runningTimer !== undefined" :colour="runningTimer.appearance.colour" size="dot" />
    </template>
    <template #messages>
      <NSnackbar class="pinned-overlay__messages" :messages="messages" />
    </template>
  </OverlayPanel>
</template>

<style scoped>
.pinned-overlay__break {
  color: var(--n-calm);
}

.pinned-overlay__messages.pinned-overlay__messages {
  position: static;
  max-width: none;
  font-size: 11.5px;
}
</style>
