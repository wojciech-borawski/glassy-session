import { shallowRef } from 'vue'
import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import type { StoredTrackedTime } from '@/domain/tracking/ports'

/** Stored tracked time and repeat day results that stay as they are given, none by default, for Storybook and component tests. */
export function createMemoryStoredTrackedTime(trackedTime: TrackedTime = {}, repeatDayResults: RepeatDayResults = {}): StoredTrackedTime {
  return { trackedTime: shallowRef(trackedTime), repeatDayResults: shallowRef(repeatDayResults) }
}
