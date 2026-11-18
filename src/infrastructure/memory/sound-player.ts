import type { Sound, Volume } from '@/domain/sound/model/sound'
import type { SoundPlayer } from '@/domain/sound/ports'
import type { Duration } from '@/utils/time/units'

type FilePlaying = { fileId: string, at: Duration, volume: Volume }

export type MemorySoundPlayer = SoundPlayer & Readonly<{
  /** Each sound it was asked to play once, in order. */
  played: readonly { sound: Sound, volume: Volume }[]
  /** The file playing now, how far into it it got and how loud it plays, or null. */
  filePlaying(): Readonly<FilePlaying> | null
  /** Moves the file playing on by the duration, as if that much of it played. */
  playFor(duration: Duration): void
  /** Plays the file playing to its end, which reports it to the listeners. */
  endFile(): void
  /** Finds that the file playing cannot play, which stops it and reports it to the listeners. */
  cannotPlayFile(): void
  /** Reports how far into the file playing it got to the listeners, as a real player does every 15 seconds. Reports nothing while no file plays. */
  reportPlace(): void
}>

/** A player that plays nothing, records each sound it was asked to play, and plays files only as far as a test moves them on. */
export function createMemorySoundPlayer(): MemorySoundPlayer {
  const played: { sound: Sound, volume: Volume }[] = []
  let playing: FilePlaying | null = null
  let cued: string | null = null
  const listeners: ((fileId: string) => void)[] = []
  const placeListeners: ((fileId: string, at: Duration) => void)[] = []
  const cannotPlayListeners: ((fileId: string) => void)[] = []
  return {
    played,
    filePlaying: () => playing,
    playFor(duration) {
      if (playing !== null) {
        playing.at += duration
      }
    },
    endFile() {
      if (playing !== null) {
        const { fileId } = playing
        playing = null
        listeners.forEach((listener) => listener(fileId))
      }
    },
    cannotPlayFile() {
      if (playing !== null) {
        const { fileId } = playing
        playing = null
        cannotPlayListeners.forEach((listener) => listener(fileId))
      }
    },
    reportPlace() {
      if (playing !== null) {
        const { fileId, at } = playing
        placeListeners.forEach((listener) => listener(fileId, at))
      }
    },
    async playOnce(sound, volume) {
      played.push({ sound, volume })
    },
    async playFile(fileId, from, volume) {
      playing = { fileId, at: from, volume }
      cued = fileId
    },
    async pauseFile() {
      const at = playing?.at ?? null
      playing = null
      cued = null
      return at
    },
    async stopFile() {
      playing = null
      cued = null
    },
    async setFileVolume(volume) {
      if (playing !== null) {
        playing.volume = volume
      }
    },
    async fileCued() {
      return cued
    },
    onFileEnded(listener) {
      listeners.push(listener)
    },
    onFilePlace(listener) {
      placeListeners.push(listener)
    },
    onFileCannotPlay(listener) {
      cannotPlayListeners.push(listener)
    }
  }
}
