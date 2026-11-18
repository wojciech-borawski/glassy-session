import type { FocusSession } from '@/domain/session/model/focus-session'
import type { StoredSessions } from '@/domain/session/ports'
import { followStorage } from './followed-storage'
import { sendSessionCommand } from './session-commands'
import { readStoredSessions, watchStoredSessions } from './session-store'

/** The stored focus sessions read from extension storage and followed through its change events, with commands sent to the background. */
export function createBrowserStoredSessions(): StoredSessions {
  return { sessions: followStorage<readonly FocusSession[]>([], readStoredSessions, watchStoredSessions), send: sendSessionCommand }
}
