import { inject, provide, type InjectionKey } from 'vue'
import type { StoredPlaylists } from './ports'
import { provideStoredHeardSound } from './stored-heard-sound'

const storedPlaylistsKey: InjectionKey<StoredPlaylists> = Symbol('stored playlists')

/** Gives every component below this one the stored playlists and background sounds, from the browser or from memory, and with them the heard sound. */
export function provideStoredPlaylists(storedPlaylists: StoredPlaylists): void {
  provide(storedPlaylistsKey, storedPlaylists)
  provideStoredHeardSound(storedPlaylists)
}

export function useStoredPlaylists(): StoredPlaylists {
  const storedPlaylists = inject(storedPlaylistsKey)
  if (!storedPlaylists) throw new Error('useStoredPlaylists needs provideStoredPlaylists in an ancestor component')
  return storedPlaylists
}
