import type { Timer } from '@/domain/timer/model/timer'
import type { StoredTimers } from '@/domain/timer/ports'
import type { Moment } from '@/utils/time/units'
import { createMemoryBackground } from './background'

type MemoryStoredTimersOptions = Readonly<{
  /** The moment each command runs at. */
  now: () => Moment
  /** The timers stored at first. Defaults to none. */
  timers?: readonly Timer[]
}>

/** Stored timers that run each command on the real timer engine over in-memory adapters, for Storybook and component tests. */
export function createMemoryStoredTimers({ now, timers = [] }: MemoryStoredTimersOptions): StoredTimers {
  return createMemoryBackground({ now, timers }).storedTimers
}
