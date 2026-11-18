<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import SoundControls from '@/domain/music/sound-controls.vue'
import { isCountingDownAt } from '@/domain/session/model/focus-session'
import RunningSessionChips from '@/domain/session/running-session-chips.vue'
import { useSessionCommands } from '@/domain/session/use-session-commands'
import RunningBar from '@/domain/timer/running-bar.vue'
import { useTimerCommands } from '@/domain/timer/use-timer-commands'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import NTabBar from '@/ui/n-tab-bar/index.vue'
import type { IconName } from '@/ui/n-icon/icons'
import { provideKeptTaskFilter } from './kept-task-filter'

const places: readonly { path: string, key: string, icon: IconName }[] = [
  { path: '/', key: 'today', icon: 'sun' },
  { path: '/timers', key: 'timers', icon: 'stopwatch' },
  { path: '/focus-sessions', key: 'focusSessions', icon: 'target' },
  { path: '/alarms', key: 'alarms', icon: 'bell' },
  { path: '/music', key: 'music', icon: 'music-note' },
  { path: '/statistics', key: 'statistics', icon: 'chart' },
  { path: '/settings', key: 'settings', icon: 'sliders' }
]

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { messages } = useSnackbar()
const asOfNow = useStoredAsOfNow()
const now = useDisplayClock()
const commands = useTimerCommands()
const sessionCommands = useSessionCommands()
provideKeptTaskFilter()

const tabs = computed(() => places.map(place => ({ id: place.path, label: t(`place.${place.key}.tab`), icon: place.icon })))
const currentPlace = computed(() => places.find(place => place.path === route.path))
</script>

<template>
  <div class="popup-shell">
    <header class="popup-shell__header">
      <h1 class="popup-shell__title">{{ currentPlace && t(`place.${currentPlace.key}.title`) }}</h1>
    </header>
    <main class="popup-shell__main">
      <RouterView />
    </main>
    <RunningBar :timers="asOfNow.timers" :now="now" @pause="commands.pause">
      <template v-if="asOfNow.sessions.some((session) => isCountingDownAt(session, now))" #before>
        <RunningSessionChips :sessions="asOfNow.sessions" :now="now" @pause="sessionCommands.pause">
          <template #sound="{ session }">
            <SoundControls :owner="{ of: 'focus session', id: session.id }" :name="session.name" size="chip" />
          </template>
        </RunningSessionChips>
      </template>
      <template #sound="{ timer }">
        <SoundControls :owner="{ of: 'timer', id: timer.id }" :name="timer.name" size="chip" />
      </template>
    </RunningBar>
    <NSnackbar :messages="messages" />
    <NTabBar :label="t('place.label')" :tabs="tabs" :current="route.path" @select="path => router.push(path)" />
  </div>
</template>

<style scoped>
.popup-shell {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  grid-template-columns: minmax(0, 1fr);
  box-sizing: border-box;
  width: 480px;
  height: 600px;
  overflow: hidden;
  background: linear-gradient(var(--n-app), var(--n-app)), var(--n-backdrop);
}

.popup-shell__header {
  padding: 12px 14px 8px;
}

.popup-shell__title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--n-font-weight-strong);
}

.popup-shell__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  padding: 4px 14px 14px;
}
</style>
