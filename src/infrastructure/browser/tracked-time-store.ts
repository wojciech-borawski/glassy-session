import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import type { RepeatDayResultStore, TrackedTimeStore } from '@/domain/tracking/ports'
import { storedRepeatDayResults, storedTrackedTime } from './storage-items'

/** The background's store. Other contexts read tracked time with readStoredTrackedTime and never change it. */
export function createBrowserTrackedTimeStore(): TrackedTimeStore {
  return {
    load: () => storedTrackedTime.getValue(),
    save: (trackedTime) => storedTrackedTime.setValue(trackedTime)
  }
}

export function readStoredTrackedTime(): Promise<TrackedTime> {
  return storedTrackedTime.getValue()
}

/** Calls the listener with the stored tracked time each time it changes, until the returned function is called. */
export function watchStoredTrackedTime(listener: (trackedTime: TrackedTime) => void): () => void {
  return storedTrackedTime.watch(listener)
}

/** The background's store of repeat day results. Other contexts read them with readStoredRepeatDayResults and never change them. */
export function createBrowserRepeatDayResultStore(): RepeatDayResultStore {
  return {
    load: () => storedRepeatDayResults.getValue(),
    save: (results) => storedRepeatDayResults.setValue(results)
  }
}

export function readStoredRepeatDayResults(): Promise<RepeatDayResults> {
  return storedRepeatDayResults.getValue()
}

/** Calls the listener with the stored repeat day results each time they change, until the returned function is called. */
export function watchStoredRepeatDayResults(listener: (results: RepeatDayResults) => void): () => void {
  return storedRepeatDayResults.watch(listener)
}
