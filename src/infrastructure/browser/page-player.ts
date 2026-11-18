import { tonesOf, type Tone } from '@/domain/sound/model/built-in-sounds'
import type { Duration } from '@/utils/time/units'
import { bell } from '@/domain/sound/model/sound'
import type { AudioFileStore, SoundPlayer } from '@/domain/sound/ports'

const SECOND = 1_000

/** How often a file playing reports how far into it it got. */
const PLACE_REPORT_EVERY = 15 * SECOND

/** How long a tone takes to swell to its loudness, in seconds, so it starts without a click. */
const ATTACK = 0.005

/** The gain a tone fades out to. An exponential fade cannot reach zero. */
const SILENT = 0.0001

type PagePlayerDependencies = Readonly<{
  /** Where the person's own audio files are kept. */
  audioFiles: AudioFileStore
  /** Makes the audio context the player plays on, the first time it plays. Defaults to the page's own Web Audio context. */
  createContext?: () => AudioContext
  /** Makes the element each audio file plays in on its own. Defaults to a new audio element of the page. */
  createAudio?: () => HTMLAudioElement
}>

/** The audio file playing on its own, in the element made for it from its content. */
type FileInPlay = Readonly<{ fileId: string, audio: HTMLAudioElement, url: string, placeReports: ReturnType<typeof setInterval> }>

function playTones(context: AudioContext, output: AudioNode, tones: readonly Tone[]) {
  const start = context.currentTime
  for (const { frequency, wave, at, length, loudness } of tones) {
    const from = start + at / SECOND
    const to = from + length / SECOND
    const oscillator = context.createOscillator()
    oscillator.type = wave
    oscillator.frequency.value = frequency
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0, from)
    envelope.gain.linearRampToValueAtTime(loudness, from + ATTACK)
    envelope.gain.exponentialRampToValueAtTime(SILENT, to)
    oscillator.connect(envelope).connect(output)
    oscillator.start(from)
    oscillator.stop(to)
  }
}

/** Decodes a copy of the bytes, since decoding takes the buffer it is given away from its owner. Gives null for bytes that are no audio. */
async function decoded(context: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer | null> {
  try {
    return await context.decodeAudioData(bytes.slice(0))
  } catch {
    return null
  }
}

function playBuffer(context: AudioContext, output: AudioNode, buffer: AudioBuffer) {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(output)
  source.start(context.currentTime)
}

/**
 * Plays sounds in a page that has a document: the popup for previews, the Firefox background page, and the Chromium offscreen document.
 * Built-in sounds are made from their tones at play time, and the person's own audio files are read from the store each time they play.
 * An own audio file that is no longer kept, or that is no audio, plays the bell instead, so a ring is never silent.
 * A file playing on its own that cannot play is reported as one that cannot play, so its playlist moves on, and a file read for an ask that a later one replaced never starts, so two files never play.
 */
export function createPagePlayer({ audioFiles, createContext = () => new AudioContext(), createAudio = () => new Audio() }: PagePlayerDependencies): SoundPlayer {
  let context: AudioContext | null = null
  let file: FileInPlay | null = null
  const endedListeners: ((fileId: string) => void)[] = []
  const placeListeners: ((fileId: string, at: Duration) => void)[] = []
  const cannotPlayListeners: ((fileId: string) => void)[] = []
  /** Counts what the player was asked to do with files, so a file read for an ask that a later one replaced never starts. */
  let asks = 0

  function couldNotPlay(fileId: string) {
    cannotPlayListeners.forEach((listener) => listener(fileId))
  }

  /** Stops the file playing and frees its content. Gives how far into it it got, or null when none played. */
  function letGoOfFile(): Duration | null {
    asks += 1
    if (file === null) {
      return null
    }
    const { audio, url, placeReports } = file
    file = null
    clearInterval(placeReports)
    audio.pause()
    const at = Math.round(audio.currentTime * SECOND)
    audio.removeAttribute('src')
    URL.revokeObjectURL(url)
    return at
  }

  return {
    async playFile(fileId, from, volume) {
      letGoOfFile()
      const ask = asks
      const data = await audioFiles.read(fileId)
      if (ask !== asks) {
        return
      }
      if (data === null) {
        console.error(`The audio file ${fileId} is no longer kept, so it cannot play`)
        couldNotPlay(fileId)
        return
      }
      const url = URL.createObjectURL(new Blob([data.bytes], { type: data.type }))
      const audio = createAudio()
      audio.src = url
      audio.currentTime = from / SECOND
      audio.volume = volume
      const placeReports = setInterval(() => {
        const at = Math.round(audio.currentTime * SECOND)
        placeListeners.forEach((listener) => listener(fileId, at))
      }, PLACE_REPORT_EVERY)
      audio.addEventListener('ended', () => {
        clearInterval(placeReports)
        endedListeners.forEach((listener) => listener(fileId))
      })
      audio.addEventListener('error', () => {
        if (file?.audio !== audio) {
          return
        }
        clearInterval(placeReports)
        console.error(`The audio file ${fileId} cannot play in this page`, audio.error)
        couldNotPlay(fileId)
      })
      file = { fileId, audio, url, placeReports }
      audio.play().catch((error: unknown) => console.error(error))
    },
    async pauseFile() {
      return letGoOfFile()
    },
    async stopFile() {
      letGoOfFile()
    },
    async setFileVolume(volume) {
      if (file !== null) {
        file.audio.volume = volume
      }
    },
    async fileCued() {
      return file?.fileId ?? null
    },
    onFileEnded(listener) {
      endedListeners.push(listener)
    },
    onFilePlace(listener) {
      placeListeners.push(listener)
    },
    onFileCannotPlay(listener) {
      cannotPlayListeners.push(listener)
    },
    async playOnce(sound, volume) {
      context ??= createContext()
      if (context.state === 'suspended') {
        await context.resume()
      }
      const output = context.createGain()
      output.gain.value = volume
      output.connect(context.destination)
      if (sound.kind === 'built-in') {
        playTones(context, output, tonesOf(sound.name))
        return
      }
      const file = await audioFiles.read(sound.fileId)
      const buffer = file === null ? null : await decoded(context, file.bytes)
      if (buffer === null) {
        playTones(context, output, tonesOf(bell.name))
        return
      }
      playBuffer(context, output, buffer)
    }
  }
}
