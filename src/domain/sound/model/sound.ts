import { isRecord } from '@/utils/is-record'

/** How loud a sound plays, from 0 for silent to 1 for full. Rings, chimes and background sounds all use it. */
export type Volume = number

export const builtInSoundNames = ['bell', 'soft chime', 'digital', 'marimba'] as const

export type BuiltInSoundName = typeof builtInSoundNames[number]

/** A sound the extension can play once: one of the built-in sounds, or one of the person's own audio files. */
export type Sound =
  | Readonly<{ kind: 'built-in', name: BuiltInSoundName }>
  | Readonly<{ kind: 'audio file', fileId: string }>

export const bell = { kind: 'built-in', name: 'bell' } as const satisfies Sound

/** Tells a sound this version can play apart from anything else, such as a saved choice of a built-in sound it does not have. */
export function isSound(value: unknown): value is Sound {
  if (!isRecord(value)) {
    return false
  }
  if (value.kind === 'built-in') {
    return (builtInSoundNames as readonly unknown[]).includes(value.name)
  }
  return value.kind === 'audio file' && typeof value.fileId === 'string'
}

/** The ring sound of a timer or an alarm. One saved before ring sounds could be chosen has none, and rings with the bell. */
export function ringSoundOf({ ringSound }: Readonly<{ ringSound?: Sound }>): Sound {
  return ringSound ?? bell
}

/** What the person sets for the sounds that are not a ring: the end chime, the start chime, and how loud rings and chimes play. */
export type SoundSettings = Readonly<{ endChime: Sound, startChime: Sound, volume: Volume }>

export const defaultSoundSettings: SoundSettings = {
  endChime: { kind: 'built-in', name: 'marimba' },
  startChime: { kind: 'built-in', name: 'soft chime' },
  volume: 0.8
}
