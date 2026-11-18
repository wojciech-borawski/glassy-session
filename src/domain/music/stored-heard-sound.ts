import { inject, provide, type InjectionKey } from 'vue'
import type { StoredHeardSound } from './ports'

const storedHeardSoundKey: InjectionKey<StoredHeardSound> = Symbol('stored heard sound')

/** Gives every component below this one what it needs to follow the heard sound and send sound commands, and nothing more of the music. */
export function provideStoredHeardSound(storedHeardSound: StoredHeardSound): void {
  provide(storedHeardSoundKey, storedHeardSound)
}

export function useStoredHeardSound(): StoredHeardSound {
  const storedHeardSound = inject(storedHeardSoundKey)
  if (!storedHeardSound) throw new Error('useStoredHeardSound needs provideStoredHeardSound or provideStoredPlaylists in an ancestor component')
  return storedHeardSound
}
