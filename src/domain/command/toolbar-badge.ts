import type { Moment } from '@/utils/time/units'
import { progressAt, type FocusSession } from '../session/model/focus-session'
import { runStateAt, type Timer } from '../timer/model/timer'

type Stored = Readonly<{ timers: readonly Timer[], sessions: readonly FocusSession[] }>

/**
 * What the toolbar badge shows: how many timers and focus sessions run, and its look, which is on break only while every one that runs
 * is a focus session on a break.
 */
export type ToolbarBadge = Readonly<{ text: string, look: 'running' | 'on break' }>

/** The most the badge counts. Above it, it shows the most with a plus, as 9+. */
const MOST_COUNTED = 9

/** The toolbar badge for the stored timers and focus sessions at the moment, or null while nothing runs. */
export function toolbarBadgeAt({ timers, sessions }: Stored, now: Moment): ToolbarBadge | null {
  const runningTimers = timers.filter((timer) => runStateAt(timer, now) === 'running')
  const runningSessionStates = sessions.map((session) => progressAt(session, now).state).filter((state) => state === 'focus step' || state === 'break')
  const count = runningTimers.length + runningSessionStates.length
  if (count === 0) {
    return null
  }
  const onBreak = runningTimers.length === 0 && runningSessionStates.every((state) => state === 'break')
  return { text: count > MOST_COUNTED ? `${MOST_COUNTED}+` : String(count), look: onBreak ? 'on break' : 'running' }
}
