import type { Timer } from '@/domain/timer/model/timer'
import type { StoredTimers } from '@/domain/timer/ports'
import { followStorage } from './followed-storage'
import { sendTimerCommand } from './timer-commands'
import { readStoredTimers, watchStoredTimers } from './timer-store'

/** The stored timers read from extension storage and followed through its change events, with commands sent to the background. */
export function createBrowserStoredTimers(): StoredTimers {
  return { timers: followStorage<readonly Timer[]>([], readStoredTimers, watchStoredTimers), send: sendTimerCommand }
}
