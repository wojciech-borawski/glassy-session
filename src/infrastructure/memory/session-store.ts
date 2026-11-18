import type { FocusSession } from '@/domain/session/model/focus-session'
import type { SessionStore } from '@/domain/session/ports'

export function createMemorySessionStore(sessions: readonly FocusSession[] = []): SessionStore {
  let stored = sessions
  return {
    async load() {
      return stored
    },
    async save(sessions) {
      stored = sessions
    }
  }
}
