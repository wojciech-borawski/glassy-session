<script setup lang="ts">
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredHeardSound } from '@/domain/music/stored-heard-sound'
import { provideStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { createTickingClock } from '@/infrastructure/browser/display-clock'
import { followStorage } from '@/infrastructure/browser/followed-storage'
import { createBrowserOverlaySettings } from '@/infrastructure/browser/overlay-settings'
import { createBrowserStoredHeardSound } from '@/infrastructure/browser/stored-heard-sound'
import { createBrowserStoredSessions } from '@/infrastructure/browser/stored-sessions'
import { createBrowserStoredTimers } from '@/infrastructure/browser/stored-timers'
import { readThemeChoice, watchThemeChoice } from '@/infrastructure/browser/theme-choice-store'
import NTheme from '@/ui/n-theme/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PinnedOverlay from './pinned-overlay.vue'

provideStoredTimers(createBrowserStoredTimers())
provideStoredSessions(createBrowserStoredSessions())
provideStoredHeardSound(createBrowserStoredHeardSound())
provideStoredOverlaySettings(createBrowserOverlaySettings())
provideDisplayClock(createTickingClock())
provideSnackbar()

const themeChoice = followStorage(null, readThemeChoice, watchThemeChoice)
</script>

<template>
  <NTheme v-if="themeChoice" :theme="themeChoice.theme" :version="themeChoice.version">
    <PinnedOverlay />
  </NTheme>
</template>
