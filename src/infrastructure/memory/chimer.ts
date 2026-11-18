import type { Ending } from '@/domain/session/model/focus-session'
import type { Chimer } from '@/domain/session/ports'

export function createMemoryChimer(): Chimer & { chimed: readonly { sessionId: string, ending: Ending }[] } {
  const chimed: { sessionId: string, ending: Ending }[] = []
  return {
    chimed,
    async chime(session, ending) {
      chimed.push({ sessionId: session.id, ending })
    }
  }
}
