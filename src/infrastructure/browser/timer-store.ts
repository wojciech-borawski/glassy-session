import type { Timer } from '@/domain/timer/model/timer'
import type { TimerStore } from '@/domain/timer/ports'
import { storedTimers } from './storage-items'

/** The background's store. Other contexts read timers with readStoredTimers and change them only through commands. */
export function createBrowserTimerStore(): TimerStore {
  return {
    load: () => storedTimers.getValue(),
    save: (timers) => storedTimers.setValue(timers)
  }
}

export function readStoredTimers(): Promise<readonly Timer[]> {
  return storedTimers.getValue()
}

/** Calls the listener with the stored timers each time they change, until the returned function is called. */
export function watchStoredTimers(listener: (timers: readonly Timer[]) => void): () => void {
  return storedTimers.watch(listener)
}
