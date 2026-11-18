import type { Sound } from './sound'

/** What plays a sound: a timer or an alarm that rings with it, a chime, or a playlist that lists it. */
export type SoundUser =
  | Readonly<{ kind: 'timer' | 'alarm' | 'playlist', name: string }>
  | Readonly<{ kind: 'end chime' | 'start chime' }>

/** One place a sound is played from. */
export type SoundUse = Readonly<{ sound: Sound, by: SoundUser }>

const audioFileIdsOf = (sounds: readonly Sound[]) => sounds.flatMap((sound) => sound.kind === 'audio file' ? [sound.fileId] : [])

/** The ids of the audio files the sounds before a change played and those after it no longer do, each once. */
export function audioFileIdsLetGo(before: readonly Sound[], after: readonly Sound[]): string[] {
  const kept = new Set(audioFileIdsOf(after))
  return [...new Set(audioFileIdsOf(before))].filter((fileId) => !kept.has(fileId))
}

/** Everything that plays the audio file, in the order of the uses. */
export function usersOfAudioFile(uses: readonly SoundUse[], fileId: string): SoundUser[] {
  return uses.flatMap(({ sound, by }) => sound.kind === 'audio file' && sound.fileId === fileId ? [by] : [])
}
