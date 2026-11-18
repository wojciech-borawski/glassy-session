import type { Timer } from '@/domain/timer/model/timer'
import type { TimerStore } from '@/domain/timer/ports'

export function createMemoryTimerStore(timers: readonly Timer[] = []): TimerStore {
  let stored = timers
  return {
    async load() {
      return stored
    },
    async save(timers) {
      stored = timers
    }
  }
}
