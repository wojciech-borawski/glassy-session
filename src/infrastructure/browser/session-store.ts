import type { FocusSession } from '@/domain/session/model/focus-session'
import type { SessionStore } from '@/domain/session/ports'
import { storedSessions } from './storage-items'

/** The background's store. Other contexts read focus sessions with readStoredSessions and change them only through commands. */
export function createBrowserSessionStore(): SessionStore {
  return {
    load: () => storedSessions.getValue(),
    save: (sessions) => storedSessions.setValue(sessions)
  }
}

export function readStoredSessions(): Promise<readonly FocusSession[]> {
  return storedSessions.getValue()
}

/** Calls the listener with the stored focus sessions each time they change, until the returned function is called. */
export function watchStoredSessions(listener: (sessions: readonly FocusSession[]) => void): () => void {
  return storedSessions.watch(listener)
}
