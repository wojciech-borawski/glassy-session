import { computed } from 'vue'
import type { Moment } from '@/utils/time/units'
import { useDisplayClock } from '../display-clock'
import type { FocusSession } from '../session/model/focus-session'
import { useStoredSessions } from '../session/stored-sessions'
import type { Timer } from '../timer/model/timer'
import { useStoredTimers } from '../timer/stored-timers'
import { localDayOf } from '../tracking/local-day'
import { useStoredTrackedTime } from '../tracking/stored-tracked-time'
import { settledAsOf, storedOf, trackingOf, type Settled } from './command-runner'

type Settlement = Readonly<{ timers: readonly Timer[], sessions: readonly FocusSession[], now: Moment, settled: Settled }>

/** The last settlement any view asked for. */
let last: Settlement | null = null

/**
 * The stored timers and focus sessions settled at the moment, on the local day. The views that read them at one tick of the display clock
 * read the same stored timers and focus sessions at the same moment, so they share one settlement instead of settling everything each.
 */
function settledAt(timers: readonly Timer[], sessions: readonly FocusSession[], now: Moment): Settled {
  if (last !== null && last.timers === timers && last.sessions === sessions && last.now === now) {
    return last.settled
  }
  const settled = settledAsOf({ timers, sessions }, now, localDayOf)
  last = { timers, sessions, now, settled }
  return settled
}

/**
 * The stored timers and focus sessions as the background would settle them at the moment of the display clock, on the local day.
 * A view shows timers through it, so a repeating task that came back since the last command shows back in every view at once,
 * and a task in a running focus session shows the time the run has left it and the session it is in.
 */
export function useStoredAsOfNow() {
  const { timers } = useStoredTimers()
  const { sessions } = useStoredSessions()
  const now = useDisplayClock()
  return computed(() => storedOf(settledAt(timers.value, sessions.value, now.value)))
}

/**
 * The stored tracked time and repeat day results as the background would record them at the moment of the display clock, on the local day.
 * A view shows them through it, so the result of a repeat day that a repeating task left by coming back shows before any command ran.
 */
export function useTrackingAsOfNow() {
  const { timers } = useStoredTimers()
  const { sessions } = useStoredSessions()
  const { trackedTime, repeatDayResults } = useStoredTrackedTime()
  const now = useDisplayClock()
  return computed(() => trackingOf(
    { trackedTime: trackedTime.value, repeatDayResults: repeatDayResults.value },
    timers.value,
    settledAt(timers.value, sessions.value, now.value),
    now.value,
    localDayOf
  ))
}
