import { addDays, weekdayOf, type Day, type Weekday } from '@/utils/time/calendar'
import type { Duration } from '@/utils/time/units'
import { trackedOn, type TrackedTime } from './tracked-time'

/** How one repeat day of a repeating task went, kept when the task comes back. */
export type RepeatDayResult = Readonly<{
  /** The task's planned time when it came back. */
  planned: Duration
  /** The time tracked from that repeat day up to the next one. */
  tracked: Duration
  /** Whether the task became finished before its next repeat day began. A skipped day was not finished. */
  finished: boolean
  /** Whether the task was skipped that day instead of finished. A result kept before skipping was possible has none. */
  skipped?: true
}>

/** The repeat day results of each repeating task, by task id and then by repeat day. */
export type RepeatDayResults = Readonly<Record<string, Readonly<Record<Day, RepeatDayResult>>>>

/** What a repeating task that comes back leaves behind. */
export type ComingBack = Readonly<{
  taskId: string
  repeatDays: readonly Weekday[]
  plannedTime: Duration
  /** The day it first used time or became done. */
  since: Day
  /** The day it became finished, or null when it did not. */
  finishedOn: Day | null
  /** Whether it became finished by being skipped that day. Defaults to false. */
  skipped?: boolean
}>

export function recordRepeatDays(results: RepeatDayResults, task: ComingBack, trackedTime: TrackedTime, today: Day): RepeatDayResults {
  const left = { ...results[task.taskId] }
  const upTo = latestRepeatDay(task.repeatDays, today)
  for (let day = latestRepeatDay(task.repeatDays, task.since); day < upTo; day = nextRepeatDay(task.repeatDays, day)) {
    const next = nextRepeatDay(task.repeatDays, day)
    const doneThatDay = task.finishedOn !== null && day <= task.finishedOn && task.finishedOn < next
    const tracked = trackedBetween(trackedTime, task.taskId, day, next)
    left[day] = doneThatDay && task.skipped === true
      ? { planned: task.plannedTime, tracked, finished: false, skipped: true }
      : { planned: task.plannedTime, tracked, finished: doneThatDay }
  }
  return { ...results, [task.taskId]: left }
}

/** A repeating task as it is before it comes back, if it does. */
export type RepeatingTask = Readonly<{
  taskId: string
  repeatDays: readonly Weekday[]
  plannedTime: Duration
  /** The day it got the repeat days it has. */
  repeatsSince: Day
  /** The day it first used time or became done, or null when it did neither. */
  usedSince: Day | null
}>

/**
 * The results with each repeat day the task was not used or done on kept as not finished, with whatever was tracked up to the next one.
 * These are the repeat days from the day it repeats since up to the one it was used or done on, or, when it was neither, up to the one
 * that has begun most recently by today, neither of the last two included. A day that already has a result keeps it.
 * Gives back the same results when there is nothing to keep.
 */
export function recordUnusedRepeatDays(results: RepeatDayResults, task: RepeatingTask, trackedTime: TrackedTime, today: Day): RepeatDayResults {
  const kept = results[task.taskId] ?? {}
  const unused: Record<Day, RepeatDayResult> = {}
  const upTo = latestRepeatDay(task.repeatDays, task.usedSince ?? today)
  for (let day = firstRepeatDay(task.repeatDays, task.repeatsSince); day < upTo; day = nextRepeatDay(task.repeatDays, day)) {
    if (kept[day] === undefined) {
      unused[day] = { planned: task.plannedTime, tracked: trackedBetween(trackedTime, task.taskId, day, nextRepeatDay(task.repeatDays, day)), finished: false }
    }
  }
  return Object.keys(unused).length === 0 ? results : { ...results, [task.taskId]: { ...kept, ...unused } }
}

/** On one of the task's repeat days, how the repeat day before it went, or null on any other day or when that day has no result. */
export function lastTimeOf(results: RepeatDayResults, taskId: string, repeatDays: readonly Weekday[], today: Day): RepeatDayResult | null {
  if (!repeatDays.includes(weekdayOf(today))) {
    return null
  }
  return results[taskId]?.[latestRepeatDay(repeatDays, addDays(today, -1))] ?? null
}

/** The time tracked on the days from the first one up to, but not including, the last one. */
function trackedBetween(trackedTime: TrackedTime, taskId: string, first: Day, last: Day): Duration {
  let tracked = 0
  for (let day = first; day < last; day = addDays(day, 1)) {
    tracked += trackedOn(trackedTime, taskId, day)
  }
  return tracked
}

/** The latest of the repeat days on or before the day. */
function latestRepeatDay(repeatDays: readonly Weekday[], day: Day): Day {
  let latest = day
  while (!repeatDays.includes(weekdayOf(latest))) {
    latest = addDays(latest, -1)
  }
  return latest
}

/** The first of the repeat days on or after the day. */
function firstRepeatDay(repeatDays: readonly Weekday[], day: Day): Day {
  return repeatDays.includes(weekdayOf(day)) ? day : nextRepeatDay(repeatDays, day)
}

/** The first of the repeat days after the day. */
function nextRepeatDay(repeatDays: readonly Weekday[], day: Day): Day {
  let next = addDays(day, 1)
  while (!repeatDays.includes(weekdayOf(next))) {
    next = addDays(next, 1)
  }
  return next
}
