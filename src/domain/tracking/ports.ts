import type { Ref } from 'vue'
import type { RepeatDayResults } from './model/repeat-day-results'
import type { TrackedTime } from './model/tracked-time'

export type TrackedTimeStore = Readonly<{
  /** Gives the stored tracked time, or an empty record when nothing is stored yet. */
  load(): Promise<TrackedTime>
  save(trackedTime: TrackedTime): Promise<void>
}>

export type RepeatDayResultStore = Readonly<{
  /** Gives the stored repeat day results, or an empty record when nothing is stored yet. */
  load(): Promise<RepeatDayResults>
  save(results: RepeatDayResults): Promise<void>
}>

/** The stored tracked time and repeat day results as a context other than the background sees them. It only reads: only the background records them. */
export type StoredTrackedTime = Readonly<{
  /** The stored tracked time, kept current each time it is saved. */
  trackedTime: Readonly<Ref<TrackedTime>>
  /** The stored repeat day results, kept current each time they are saved. */
  repeatDayResults: Readonly<Ref<RepeatDayResults>>
}>
