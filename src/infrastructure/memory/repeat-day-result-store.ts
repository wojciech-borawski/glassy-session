import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { RepeatDayResultStore } from '@/domain/tracking/ports'

export function createMemoryRepeatDayResultStore(results: RepeatDayResults = {}): RepeatDayResultStore {
  let stored = results
  return {
    async load() {
      return stored
    },
    async save(results) {
      stored = results
    }
  }
}
