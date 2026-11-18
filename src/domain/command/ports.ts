import type { Moment } from '@/utils/time/units'
import type { FocusSession } from '../session/model/focus-session'
import type { Timer } from '../timer/model/timer'
import type { ToolbarBadge } from './toolbar-badge'

/** What a wake is for. A timer, a focus session and an alarm may share an id, but never a wake. */
export type Wake = Readonly<{ of: 'timer' | 'focus session' | 'alarm', id: string }>

/** A wake and the moment it is set to. */
export type WakeAt = Readonly<{ wake: Wake, moment: Moment }>

/** Wakes the background at a timer's, a focus session's or an alarm's wake, so it is settled even after the service worker stopped. */
export type WakeScheduler = Readonly<{
  /** Sets the wake to the moment, replacing an earlier moment of the same wake. */
  wakeAt(wake: Wake, moment: Moment): Promise<void>
  cancel(wake: Wake): Promise<void>
  /** The wakes that are set now, of every kind, so a command can set one that a background that stopped never set. */
  scheduled(): Promise<readonly WakeAt[]>
}>

type TimersAndSessions = Readonly<{ timers: readonly Timer[], sessions: readonly FocusSession[] }>

/**
 * The timers and focus sessions the runner loads and saves. It saves both in one write, so a background that stops cannot keep
 * one without the other, and no view reads new focus sessions beside old timers.
 */
export type TimersAndSessionsStore = Readonly<{
  load(): Promise<TimersAndSessions>
  save(stored: TimersAndSessions): Promise<void>
}>

/** The extension's toolbar button, which shows the toolbar badge. */
export type ToolbarButton = Readonly<{
  /** Shows the badge on the button, or no badge for null. It never rejects: a badge that cannot be shown is logged, so no command fails for it. */
  showBadge(badge: ToolbarBadge | null): Promise<void>
}>
