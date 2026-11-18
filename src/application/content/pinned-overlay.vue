<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import SoundControls from '@/domain/music/sound-controls.vue'
import { useStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import OverlayPanel from '@/domain/overlay/overlay-panel.vue'
import { isPinned as isSessionPinned } from '@/domain/session/model/focus-session'
import PinnedSession from '@/domain/session/pinned-session.vue'
import { useSessionCommands } from '@/domain/session/use-session-commands'
import { isPinned } from '@/domain/timer/model/timer'
import PinnedTimer from '@/domain/timer/pinned-timer.vue'
import { useTimerCommands } from '@/domain/timer/use-timer-commands'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { useSnackbar } from '@/ui/n-snackbar/snackbar'

const asOfNow = useStoredAsOfNow()
const { settings, change } = useStoredOverlaySettings()
const now = useDisplayClock()
const timerCommands = useTimerCommands()
const sessionCommands = useSessionCommands()
const { messages } = useSnackbar()

const pinnedTimers = computed(() => asOfNow.value.timers.filter(isPinned))
const pinnedSessions = computed(() => asOfNow.value.sessions.filter(isSessionPinned))
const count = computed(() => pinnedTimers.value.length + pinnedSessions.value.length)
</script>

<template>
  <OverlayPanel
    v-if="settings.shownOnPages && count > 0"
    :corner="settings.corner"
    :collapsed="settings.collapsed"
    :count="count"
    @collapse="change({ collapsed: true })"
    @expand="change({ collapsed: false })"
    @move="corner => change({ corner })"
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
    <template #messages>
      <NSnackbar class="pinned-overlay__messages" :messages="messages" />
    </template>
  </OverlayPanel>
</template>

<style scoped>
.pinned-overlay__messages.pinned-overlay__messages {
  position: static;
  max-width: none;
  font-size: 11.5px;
}
</style>
