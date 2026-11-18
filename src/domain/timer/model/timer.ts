import type { ColourName } from '@/ui/colours'
import { addDays, weekdayOf, type Day, type Weekday } from '@/utils/time/calendar'
import type { Duration, Moment, Span } from '@/utils/time/units'
import type { Sound } from '../../sound/model/sound'
import type { DayOf } from '@/utils/time/calendar'

/** How a timer looks wherever it shows. */
export type Appearance = Readonly<{ colour: ColourName }>

export type Timer = Readonly<{
  id: string
  name: string
  description?: string
  kind: 'timer' | 'task'
  plannedTime: Duration
  appearance: Appearance
  /** The sound it rings with. A timer saved before ring sounds could be chosen has none, and rings with the bell. */
  ringSound?: Sound
  /** The days of the week a repeating task comes back on, at least one. A task without them is a one-time task. */
  repeatDays?: readonly Weekday[]
  /** When the task got the repeat days it has. A repeating task saved before this was kept has none, and keeps no result for a repeat day it was not used or done on. */
  repeatsSince?: Moment
  /** The remaining time as of the moment the timer last stopped running. */
  remainingTime: Duration
  runningSince: Moment | null
  /** When the task first used time since it last had all of its planned time. A repeating task comes back on the next repeat day after it. */
  usedSince?: Moment
  /** When a task became done, and the remaining time it had just before, which undoing done gives back. A timer is never done. A repeating task skipped today says so. */
  done?: Readonly<{ at: Moment, remainingTimeBefore: Duration, skipped?: true }>
  /** Whether the timer shows in the overlay on every page. A timer without it is not pinned. */
  pinned?: boolean
}>

export type NewTimer = Omit<Timer, 'remainingTime' | 'runningSince' | 'usedSince' | 'done' | 'repeatsSince'>

/** What the person can change on a stored timer. */
export type TimerDetails = Pick<Timer, 'name' | 'description' | 'plannedTime' | 'appearance' | 'repeatDays' | 'ringSound' | 'pinned'>

export type RunState = 'idle' | 'running' | 'paused' | 'finished'

export type Transition = Readonly<{
  timer: Timer
  /** The span the timer was running that this transition ended, or null when it ended none. A span is never empty. */
  ran: Span | null
}>

function checkDetails({ name, kind, plannedTime, repeatDays }: Pick<Timer, 'name' | 'kind' | 'plannedTime' | 'repeatDays'>) {
  if (!Number.isFinite(plannedTime) || plannedTime <= 0) {
    throw new RangeError(`A timer needs a positive planned time, got ${plannedTime}`)
  }
  if (name.trim() === '') {
    throw new RangeError('A timer needs a name')
  }
  if (repeatDays !== undefined && kind !== 'task') {
    throw new RangeError('A timer does not repeat, only a task does')
  }
  if (repeatDays?.length === 0) {
    throw new RangeError('A repeating task needs at least one repeat day')
  }
}

/** The timer as it is added at the moment, a repeating task repeating since then. Without the moment, a repeating task keeps no repeat since. */
export function createTimer(input: NewTimer, now?: Moment): Timer {
  checkDetails(input)
  const repeatsSince = input.repeatDays === undefined || now === undefined ? {} : { repeatsSince: now }
  return { ...input, ...repeatsSince, remainingTime: input.plannedTime, runningSince: null }
}

/** A task brought to zero is done from the moment it ran out. A timer is never done. */
function ranOutAt(timer: Timer, moment: Moment): Timer {
  if (timer.kind !== 'task' || timer.remainingTime > 0 || timer.done !== undefined) {
    return timer
  }
  return { ...timer, done: { at: moment, remainingTimeBefore: 0 } }
}

export function remainingTimeAt(timer: Timer, now: Moment): Duration {
  if (timer.runningSince === null) {
    return timer.remainingTime
  }
  const elapsed = Math.max(0, now - timer.runningSince)
  return Math.max(0, timer.remainingTime - elapsed)
}

export function runStateAt(timer: Timer, now: Moment): RunState {
  if (remainingTimeAt(timer, now) === 0) {
    return 'finished'
  }
  if (timer.runningSince !== null) {
    return 'running'
  }
  if (timer.remainingTime < timer.plannedTime) {
    return 'paused'
  }
  return 'idle'
}

export function finishesAt(timer: Timer): Moment | null {
  if (timer.runningSince === null) {
    return null
  }
  return timer.runningSince + timer.remainingTime
}

export function start(timer: Timer, now: Moment): Transition {
  const state = runStateAt(timer, now)
  if (state === 'running' || state === 'finished') {
    return { timer, ran: null }
  }
  return { timer: { ...timer, runningSince: now, usedSince: timer.usedSince ?? now }, ran: null }
}

export function pause(timer: Timer, now: Moment): Transition {
  if (timer.runningSince === null) {
    return { timer, ran: null }
  }
  const from = timer.runningSince
  const to = Math.min(Math.max(from, now), from + timer.remainingTime)
  return {
    timer: ranOutAt({ ...timer, remainingTime: remainingTimeAt(timer, to), runningSince: null }, to),
    ran: to > from ? { from, to } : null
  }
}

export function settle(timer: Timer, now: Moment): Transition {
  if (remainingTimeAt(timer, now) > 0) {
    return { timer, ran: null }
  }
  return pause(timer, now)
}

export function useUp(timer: Timer, span: Span): Transition {
  const used = Math.max(0, Math.min(span.to - span.from, timer.remainingTime))
  const usedSince = used > 0 ? timer.usedSince ?? span.from : timer.usedSince
  return { timer: ranOutAt({ ...timer, remainingTime: timer.remainingTime - used, usedSince }, span.from + used), ran: used > 0 ? { from: span.from, to: span.from + used } : null }
}

export function reset(timer: Timer, now: Moment): Transition {
  const { ran } = pause(timer, now)
  return { timer: { ...timer, remainingTime: timer.plannedTime, runningSince: null, usedSince: undefined, done: undefined }, ran }
}

export function withDetails(timer: Timer, details: TimerDetails, now: Moment): Transition {
  checkDetails({ ...details, kind: timer.kind })
  const { name, description, plannedTime, appearance, repeatDays, ringSound, pinned = timer.pinned } = details
  const paused = pause(timer, now)
  const left = paused.timer.remainingTime
  const remainingTime = left === 0 ? 0 : Math.max(0, left + plannedTime - timer.plannedTime)
  const runningSince = timer.runningSince === null || remainingTime === 0 ? null : now
  const repeatsSince = sameDays(repeatDays, timer.repeatDays) ? timer.repeatsSince : repeatDays === undefined ? undefined : now
  return { timer: ranOutAt({ ...paused.timer, name, description, plannedTime, appearance, repeatDays, repeatsSince, ringSound, pinned, remainingTime, runningSince }, now), ran: paused.ran }
}

function sameDays(one: readonly Weekday[] | undefined, other: readonly Weekday[] | undefined): boolean {
  return one?.length === other?.length && (one ?? []).every((day) => other?.includes(day))
}

/** The task done at the moment, stopped first, and skipped when it is. A task that is already done stays done as it was. */
function doneAt(timer: Timer, now: Moment, skipped: boolean): Transition {
  if (timer.kind !== 'task') {
    throw new RangeError('Only a task can be done')
  }
  const paused = pause(timer, now)
  if (paused.timer.done !== undefined) {
    return paused
  }
  const remainingTimeBefore = paused.timer.remainingTime
  const done = skipped ? { at: now, remainingTimeBefore, skipped: true } as const : { at: now, remainingTimeBefore }
  return { timer: { ...paused.timer, remainingTime: 0, done }, ran: paused.ran }
}

export function markDone(timer: Timer, now: Moment): Transition {
  return doneAt(timer, now, false)
}

/** Marks a repeating task done for the day as skipped. A task that is already done stays as it was. */
export function skipToday(timer: Timer, now: Moment): Transition {
  if (timer.repeatDays === undefined) {
    throw new RangeError('Only a repeating task can be skipped today')
  }
  return doneAt(timer, now, true)
}

export function undoDone(timer: Timer): Transition {
  if (timer.remainingTime > 0) {
    return { timer, ran: null }
  }
  const remainingTimeBefore = timer.done?.remainingTimeBefore ?? 0
  return { timer: { ...timer, remainingTime: remainingTimeBefore > 0 ? remainingTimeBefore : timer.plannedTime, done: undefined }, ran: null }
}

export function isPinned(timer: Timer): boolean {
  return timer.pinned === true
}

export function pin(timer: Timer): Transition {
  return { timer: { ...timer, pinned: true }, ran: null }
}

export function unpin(timer: Timer): Transition {
  return { timer: { ...timer, pinned: false }, ran: null }
}

/** Whether one of the repeat days falls after the first day and no later than the last, looking at most a week ahead. */
function repeatsBetween(repeatDays: readonly Weekday[], after: Day, upTo: Day): boolean {
  for (let day = addDays(after, 1), count = 0; day <= upTo && count < 7; day = addDays(day, 1), count++) {
    if (repeatDays.includes(weekdayOf(day))) {
      return true
    }
  }
  return false
}

/** When the task first used time or, when it became done without using any, when it became done. */
export function usedOrDoneSince(timer: Timer): Moment | undefined {
  return timer.usedSince ?? timer.done?.at
}

/** Whether the timer is a repeating task that used time or was done before one of its repeat days that has begun by the moment. */
export function comesBack(timer: Timer, now: Moment, dayOf: DayOf): boolean {
  const since = usedOrDoneSince(timer)
  return timer.repeatDays !== undefined && since !== undefined && repeatsBetween(timer.repeatDays, dayOf(since).day, dayOf(now).day)
}

/**
 * The task as it is on the local day of the moment: a repeating task that comes back is idle with all of its planned time,
 * whether or not it was finished, and the span it was still running up to the moment is reported. Any other timer is unchanged.
 */
export function comeBack(timer: Timer, now: Moment, dayOf: DayOf): Transition {
  if (!comesBack(timer, now, dayOf)) {
    return { timer, ran: null }
  }
  const { ran } = pause(timer, now)
  return { timer: { ...timer, remainingTime: timer.plannedTime, runningSince: null, usedSince: undefined, done: undefined }, ran }
}

/** Whether the timer is a repeating task and the local day of the moment is one of its repeat days. */
export function repeatsToday(timer: Timer, now: Moment, dayOf: DayOf): boolean {
  return timer.repeatDays?.includes(weekdayOf(dayOf(now).day)) ?? false
}

/** Whether the timer or task belongs on Today on the local day of the moment, as it is on that day. */
export function isForToday(timer: Timer, now: Moment, dayOf: DayOf): boolean {
  if (timer.repeatDays !== undefined) {
    return repeatsToday(timer, now, dayOf)
  }
  const { done } = settle(timer, now).timer
  return done === undefined || dayOf(done.at).day === dayOf(now).day
}
