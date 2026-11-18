import type { TimersAndSessionsStore } from '@/domain/command/ports'
import { storedSessions, storedTimers } from './storage-items'

/** The background runner's store. It writes timers and focus sessions in one `storage.local.set`, which Chromium and Firefox apply at once. */
export function createBrowserTimersAndSessionsStore(): TimersAndSessionsStore {
  return {
    load: async () => {
      const [timers, sessions] = await Promise.all([storedTimers.getValue(), storedSessions.getValue()])
      return { timers, sessions }
    },
    save: ({ timers, sessions }) => storage.setItems([{ item: storedTimers, value: timers }, { item: storedSessions, value: sessions }])
  }
}
