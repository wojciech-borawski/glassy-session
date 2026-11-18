import type { TimersAndSessionsStore } from '@/domain/command/ports'
import type { SessionStore } from '@/domain/session/ports'
import type { TimerStore } from '@/domain/timer/ports'

/** Loads and saves through the in-memory timer and session stores, which change in the same turn, so nothing reads one without the other. */
export function createMemoryTimersAndSessionsStore(timerStore: TimerStore, sessionStore: SessionStore): TimersAndSessionsStore {
  return {
    load: async () => ({ timers: await timerStore.load(), sessions: await sessionStore.load() }),
    save: async ({ timers, sessions }) => {
      await Promise.all([timerStore.save(timers), sessionStore.save(sessions)])
    }
  }
}
