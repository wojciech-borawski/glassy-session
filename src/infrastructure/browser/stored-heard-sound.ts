import { computed } from 'vue'
import { noPlayback } from '@/domain/music/model/playback'
import type { SavedMusic, StoredHeardSound } from '@/domain/music/ports'
import { followStorage } from './followed-storage'
import { sendSoundCommand } from './music-commands'
import { readStoredMusic, watchStoredMusic } from './music-store'
import { readStoredPlayback, watchStoredPlayback } from './playback-store'

/** The stored playlists, background sounds and playback read from extension storage and followed through its change events, with sound commands sent to the background. */
export function createBrowserStoredHeardSound(): StoredHeardSound {
  const music = followStorage<SavedMusic>({ playlists: [], backgroundSounds: [] }, readStoredMusic, watchStoredMusic)
  return {
    playlists: computed(() => music.value.playlists),
    backgroundSounds: computed(() => music.value.backgroundSounds),
    playback: followStorage(noPlayback, readStoredPlayback, watchStoredPlayback),
    sendSound: sendSoundCommand
  }
}
