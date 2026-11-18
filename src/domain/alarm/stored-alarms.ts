import { inject, provide, type InjectionKey } from 'vue'
import type { StoredAlarms } from './ports'

const storedAlarmsKey: InjectionKey<StoredAlarms> = Symbol('stored alarms')

/** Gives every component below this one the stored alarms, from the browser or from memory. */
export function provideStoredAlarms(storedAlarms: StoredAlarms): void {
  provide(storedAlarmsKey, storedAlarms)
}

export function useStoredAlarms(): StoredAlarms {
  const storedAlarms = inject(storedAlarmsKey)
  if (!storedAlarms) throw new Error('useStoredAlarms needs provideStoredAlarms in an ancestor component')
  return storedAlarms
}
