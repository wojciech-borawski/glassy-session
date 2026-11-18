import type { MusicStore, SavedMusic } from '@/domain/music/ports'

export function createMemoryMusicStore(saved: SavedMusic = { playlists: [], backgroundSounds: [] }): MusicStore {
  let stored = saved
  return {
    async load() {
      return stored
    },
    async save(saved) {
      stored = saved
    }
  }
}
