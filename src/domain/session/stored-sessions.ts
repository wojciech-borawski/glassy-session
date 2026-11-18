import { inject, provide, type InjectionKey } from 'vue'
import type { StoredSessions } from './ports'

const storedSessionsKey: InjectionKey<StoredSessions> = Symbol('stored focus sessions')

/** Gives every component below this one the stored focus sessions, from the browser or from memory. */
export function provideStoredSessions(storedSessions: StoredSessions): void {
  provide(storedSessionsKey, storedSessions)
}

export function useStoredSessions(): StoredSessions {
  const storedSessions = inject(storedSessionsKey)
  if (!storedSessions) throw new Error('useStoredSessions needs provideStoredSessions in an ancestor component')
  return storedSessions
}
