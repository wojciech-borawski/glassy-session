import type { MusicStore, SavedMusic } from '@/domain/music/ports'
import { storedMusic } from './storage-items'

/** The background's store. Other contexts read playlists and background sounds with readStoredMusic and change them only through commands. */
export function createBrowserMusicStore(): MusicStore {
  return {
    load: () => storedMusic.getValue(),
    save: (saved) => storedMusic.setValue(saved)
  }
}

export function readStoredMusic(): Promise<SavedMusic> {
  return storedMusic.getValue()
}

/** Calls the listener with the stored playlists and background sounds each time they are saved, until the returned function is called. */
export function watchStoredMusic(listener: (saved: SavedMusic) => void): () => void {
  return storedMusic.watch(listener)
}
