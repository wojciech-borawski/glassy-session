import { noPlayback, withPlaceReported, type Playback } from '@/domain/music/model/playback'
import type { PlaybackStore } from '@/domain/music/ports'

export function createMemoryPlaybackStore(playback: Playback = noPlayback): PlaybackStore {
  let stored = playback
  return {
    async load() {
      return stored
    },
    async save(playback) {
      stored = playback
    },
    async savePlace(place) {
      stored = withPlaceReported(stored, place)
    }
  }
}
