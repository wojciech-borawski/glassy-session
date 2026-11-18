<script setup lang="ts">
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { provideSounds } from '@/domain/sound/sounds'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { provideStoredTrackedTime } from '@/domain/tracking/stored-tracked-time'
import { createBrowserAudioFileStore } from '@/infrastructure/browser/audio-file-store'
import { createTickingClock } from '@/infrastructure/browser/display-clock'
import { readManifestVersion } from '@/infrastructure/browser/extension-version'
import { createBrowserOverlaySettings } from '@/infrastructure/browser/overlay-settings'
import { createPagePlayer } from '@/infrastructure/browser/page-player'
import { createBrowserSoundSettingsStore } from '@/infrastructure/browser/sound-settings-store'
import { createBrowserStoredAlarms } from '@/infrastructure/browser/stored-alarms'
import { createBrowserStoredPlaylists } from '@/infrastructure/browser/stored-playlists'
import { createBrowserStoredSessions } from '@/infrastructure/browser/stored-sessions'
import { createBrowserStoredTimers } from '@/infrastructure/browser/stored-timers'
import { createBrowserStoredTrackedTime } from '@/infrastructure/browser/stored-tracked-time'
import { readThemeChoice, saveThemeChoice } from '@/infrastructure/browser/theme-choice-store'
import NTheme from '@/ui/n-theme/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import { provideExtensionVersion } from './extension-version'
import PopupShell from './popup-shell.vue'
import { provideThemeChoice } from './theme-choice'

const { theme, version, chooseTheme, chooseVersion } = provideThemeChoice()
provideStoredTimers(createBrowserStoredTimers())
provideStoredSessions(createBrowserStoredSessions())
provideStoredTrackedTime(createBrowserStoredTrackedTime())
provideStoredAlarms(createBrowserStoredAlarms())
provideStoredOverlaySettings(createBrowserOverlaySettings())
provideStoredPlaylists(createBrowserStoredPlaylists())
provideDisplayClock(createTickingClock())
const audioFiles = createBrowserAudioFileStore()
provideSounds({ player: createPagePlayer({ audioFiles }), audioFiles, soundSettings: createBrowserSoundSettingsStore() })
provideSnackbar()
provideExtensionVersion(readManifestVersion)

const themeRestored = ref(false)
void readThemeChoice().then((saved) => {
  chooseTheme(saved.theme)
  chooseVersion(saved.version)
  themeRestored.value = true
})
watch([theme, version], ([chosenTheme, chosenVersion]) => {
  if (themeRestored.value) {
    void saveThemeChoice({ theme: chosenTheme, version: chosenVersion })
  }
}, { flush: 'sync' })
</script>

<template>
  <NTheme v-if="themeRestored" :theme="theme" :version="version">
    <PopupShell />
  </NTheme>
</template>
