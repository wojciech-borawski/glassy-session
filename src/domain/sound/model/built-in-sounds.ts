import type { Duration } from '@/utils/time/units'
import type { BuiltInSoundName } from './sound'

/** One note of a built-in sound: a wave at a pitch that starts at a moment after the sound starts and fades out over its length. */
export type Tone = Readonly<{
  /** The pitch in hertz. */
  frequency: number
  wave: 'sine' | 'triangle' | 'square'
  at: Duration
  length: Duration
  /** How loud the tone starts, from 0 for silent to 1 for full, before the volume it is played at. */
  loudness: number
}>

const TONES: Readonly<Record<BuiltInSoundName, readonly Tone[]>> = {
  'bell': [
    { frequency: 880, wave: 'sine', at: 0, length: 1_800, loudness: 0.5 },
    { frequency: 1_760, wave: 'sine', at: 0, length: 1_200, loudness: 0.2 },
    { frequency: 2_428, wave: 'sine', at: 0, length: 700, loudness: 0.1 }
  ],
  'soft chime': [
    { frequency: 659.25, wave: 'sine', at: 0, length: 1_200, loudness: 0.25 },
    { frequency: 987.77, wave: 'sine', at: 180, length: 1_200, loudness: 0.2 }
  ],
  'digital': [
    { frequency: 1_046.5, wave: 'square', at: 0, length: 90, loudness: 0.12 },
    { frequency: 1_046.5, wave: 'square', at: 160, length: 90, loudness: 0.12 },
    { frequency: 1_046.5, wave: 'square', at: 320, length: 90, loudness: 0.12 }
  ],
  'marimba': [
    { frequency: 523.25, wave: 'triangle', at: 0, length: 500, loudness: 0.3 },
    { frequency: 659.25, wave: 'triangle', at: 130, length: 500, loudness: 0.3 },
    { frequency: 783.99, wave: 'triangle', at: 260, length: 700, loudness: 0.3 }
  ]
}

/** The tones a built-in sound is made of. They are played by the Web Audio API, so the extension carries no audio files of its own. */
export function tonesOf(name: BuiltInSoundName): readonly Tone[] {
  return TONES[name]
}
