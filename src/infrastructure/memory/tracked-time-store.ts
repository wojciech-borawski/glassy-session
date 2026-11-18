import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import type { TrackedTimeStore } from '@/domain/tracking/ports'

export function createMemoryTrackedTimeStore(trackedTime: TrackedTime = {}): TrackedTimeStore {
  let stored = trackedTime
  return {
    async load() {
      return stored
    },
    async save(trackedTime) {
      stored = trackedTime
    }
  }
}
