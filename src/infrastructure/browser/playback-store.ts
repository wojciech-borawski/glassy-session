import { withPlaceReported, type Playback } from '@/domain/music/model/playback'
import type { PlaybackStore } from '@/domain/music/ports'
import { storedPlayback, storedPlaybackPlace } from './storage-items'

/** The background's store. Other contexts read the playback with readStoredPlayback and change it only through sound commands. */
export function createBrowserPlaybackStore(): PlaybackStore {
  return {
    async load() {
      const [playback, place] = await Promise.all([storedPlayback.getValue(), storedPlaybackPlace.getValue()])
      return place === null ? playback : withPlaceReported(playback, place)
    },
    async save(playback) {
      await storage.setItems([{ item: storedPlayback, value: playback }, { item: storedPlaybackPlace, value: null }])
    },
    savePlace: (place) => storedPlaybackPlace.setValue(place)
  }
}

export function readStoredPlayback(): Promise<Playback> {
  return storedPlayback.getValue()
}

/** Calls the listener with the stored playback each time it is saved, until the returned function is called. */
export function watchStoredPlayback(listener: (playback: Playback) => void): () => void {
  return storedPlayback.watch(listener)
}
