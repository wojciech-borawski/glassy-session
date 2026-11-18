import { inject, provide, type InjectionKey } from 'vue'
import type { StoredTrackedTime } from './ports'

const storedTrackedTimeKey: InjectionKey<StoredTrackedTime> = Symbol('stored tracked time')

/** Gives every component below this one the stored tracked time, from the browser or from memory. */
export function provideStoredTrackedTime(storedTrackedTime: StoredTrackedTime): void {
  provide(storedTrackedTimeKey, storedTrackedTime)
}

export function useStoredTrackedTime(): StoredTrackedTime {
  const storedTrackedTime = inject(storedTrackedTimeKey)
  if (!storedTrackedTime) throw new Error('useStoredTrackedTime needs provideStoredTrackedTime in an ancestor component')
  return storedTrackedTime
}
