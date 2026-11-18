import { shallowRef } from 'vue'
import { failure, type Refusal } from '@/domain/command/command-outcome'
import { createCommandQueue } from '@/domain/command/command-queue'
import { keepAudioFile } from '@/domain/music/keep-audio-file'
import { noPlayback, type OwnerEvent, type Playback } from '@/domain/music/model/playback'
import { createMusicEngine } from '@/domain/music/music-engine'
import { createPlaybackEngine } from '@/domain/music/playback-engine'
import type { SavedMusic, StoredPlaylists } from '@/domain/music/ports'
import type { SoundUse } from '@/domain/sound/model/sound-use'
import type { AudioFileStore } from '@/domain/sound/ports'
import { createMemoryAudioFileStore } from './audio-file-store'
import { createMemoryMusicStore } from './music-store'
import { createMemoryPlaybackStore } from './playback-store'
import { createMemorySoundPlayer } from './sound-player'

/** The length every audio file kept in memory plays for. */
const LENGTH = 180_000

/** A file is audio in memory when its type says so, and it plays for three minutes. */
const lengthByType = async (file: Blob) => file.type.startsWith('audio/') ? LENGTH : null

export type MemoryMusic = Readonly<{
  storedPlaylists: StoredPlaylists
  /** Has the playback follow what timers and focus sessions did, as the background's command runner tells it. */
  ownersChanged(events: readonly OwnerEvent[]): Promise<void>
}>

type MemorySoundsShared = Readonly<{
  /** The audio file store shared with the rings and chimes. Defaults to one of their own, keeping the files of the playlists given. */
  audioFiles?: AudioFileStore
  /** The ring sounds and chimes that play the audio files, and what plays each. Defaults to none. */
  soundUses?: () => Promise<readonly SoundUse[]>
}>

/**
 * Stored playlists that run each music command on the real music engine and each sound command on the real playback engine,
 * in one queue over in-memory adapters and a player that plays nothing aloud, for Storybook and component tests.
 * Unless they are given the audio files and their uses, their audio files are their own, so no ring or chime uses them.
 */
export function createMemoryMusic(saved: SavedMusic = { playlists: [], backgroundSounds: [] }, startingPlayback: Playback = noPlayback, shared: MemorySoundsShared = {}): MemoryMusic {
  const inTurn = createCommandQueue()
  const musicStore = createMemoryMusicStore(saved)
  const playbackStore = createMemoryPlaybackStore(startingPlayback)
  const audioFiles = shared.audioFiles ?? createMemoryAudioFileStore(saved.playlists.flatMap(({ files }) => files.map(({ id, name }) => ({ id, name, type: 'audio/mpeg' }))))
  const playbackEngine = createPlaybackEngine({ inTurn, musicStore, playbackStore, player: createMemorySoundPlayer() })
  const engine = createMusicEngine({ inTurn, musicStore, audioFiles, soundUses: shared.soundUses ?? (async () => []), followMusic: playbackEngine.followMusic })
  const playlists = shallowRef(saved.playlists)
  const backgroundSounds = shallowRef(saved.backgroundSounds)
  const playback = shallowRef(startingPlayback)

  async function following(running: () => Promise<Refusal | null>): Promise<Refusal | null> {
    try {
      const refusal = await running()
      const after = await musicStore.load()
      playlists.value = after.playlists
      backgroundSounds.value = after.backgroundSounds
      playback.value = await playbackStore.load()
      return refusal
    } catch (error) {
      return failure(error)
    }
  }

  return {
    storedPlaylists: {
      playlists,
      backgroundSounds,
      playback,
      send: (command) => following(() => engine.run(command)),
      sendSound: (command) => following(() => playbackEngine.run(command)),
      keepFile: (file) => keepAudioFile(file, audioFiles, lengthByType)
    },
    async ownersChanged(events) {
      await following(async () => {
        await playbackEngine.ownersChanged(events)
        return null
      })
    }
  }
}

/** The stored playlists of `createMemoryMusic`, starting with the music and the playback given. */
export function createMemoryStoredPlaylists(saved?: SavedMusic, startingPlayback?: Playback, shared?: MemorySoundsShared): StoredPlaylists {
  return createMemoryMusic(saved, startingPlayback, shared).storedPlaylists
}
