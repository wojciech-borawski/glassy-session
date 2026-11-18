import { keepAudioFile } from '@/domain/music/keep-audio-file'
import type { StoredPlaylists } from '@/domain/music/ports'
import { createBrowserAudioFileStore } from './audio-file-store'
import { readAudioLength } from './audio-length'
import { sendMusicCommand } from './music-commands'
import { createBrowserStoredHeardSound } from './stored-heard-sound'

/** The stored playlists, background sounds and playback read from extension storage and followed through its change events, with commands sent to the background. */
export function createBrowserStoredPlaylists(): StoredPlaylists {
  const audioFiles = createBrowserAudioFileStore()
  return {
    ...createBrowserStoredHeardSound(),
    send: sendMusicCommand,
    keepFile: (file) => keepAudioFile(file, audioFiles, readAudioLength)
  }
}
