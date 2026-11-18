import { inject, provide, type InjectionKey } from 'vue'
import type { StoredTimers } from './ports'

const storedTimersKey: InjectionKey<StoredTimers> = Symbol('stored timers')

/** Gives every component below this one the stored timers, from the browser or from memory. */
export function provideStoredTimers(storedTimers: StoredTimers): void {
  provide(storedTimersKey, storedTimers)
}

export function useStoredTimers(): StoredTimers {
  const storedTimers = inject(storedTimersKey)
  if (!storedTimers) throw new Error('useStoredTimers needs provideStoredTimers in an ancestor component')
  return storedTimers
}
