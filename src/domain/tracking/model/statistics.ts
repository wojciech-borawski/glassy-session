import { addDays, lastDayOfMonth, weekdayOf, type Day, type Weekday } from '@/utils/time/calendar'
import type { Duration } from '@/utils/time/units'
import type { RepeatDayResult, RepeatDayResults } from './repeat-day-results'
import { trackedOn, type TrackedTime } from './tracked-time'

/** The days from first to last, both included. */
export type DayRange = Readonly<{ first: Day, last: Day }>

export const MONDAY: Weekday = 1

/** The ids of the tasks the statistics is narrowed to. When none is chosen, it shows all tasks. */
export type TaskFilter = readonly string[]

/** What the statistics needs to know about a task: its id and its name. */
export type NamedTask = Readonly<{ id: string, name: string }>

/** What day progress needs to know about a task: its id and its planned time. */
export type PlannedTask = Readonly<{ id: string, plannedTime: Duration }>

export type DayProgress = Readonly<{
  tracked: Duration
  planned: Duration
  /** The tracked time as a part of the planned time. It is above 1 when the task ran for longer than its planned time that day. */
  fraction: number
}>

export type TaskTotal = Readonly<{
  taskId: string
  /** The task's name, or null when the task has been removed. */
  name: string | null
  tracked: Duration
}>

export type DayTotal = Readonly<{ day: Day, tracked: Duration, tasks: readonly TaskTotal[] }>

export type Totals = Readonly<{ days: readonly DayTotal[], tasks: readonly TaskTotal[], tracked: Duration }>

export function totalsFor(trackedTime: TrackedTime, range: DayRange, tasks: readonly NamedTask[]): Totals {
  const daysInRange = daysOf(range)
  const days = daysInRange.map((day) => {
    const dayTasks = taskTotalsOver(trackedTime, [day], tasks)
    return { day, tracked: sumOf(dayTasks), tasks: dayTasks }
  })
  return { days, tasks: taskTotalsOver(trackedTime, daysInRange, tasks), tracked: sumOf(days) }
}

export function weekOf(day: Day, firstDayOfWeek: Weekday): DayRange {
  const daysSinceWeekStart = (weekdayOf(day) - firstDayOfWeek + 7) % 7
  const first = addDays(day, -daysSinceWeekStart)
  return { first, last: addDays(first, 6) }
}

export function weekBefore(week: DayRange): DayRange {
  return { first: addDays(week.first, -7), last: addDays(week.last, -7) }
}

export function weekAfter(week: DayRange): DayRange {
  return { first: addDays(week.first, 7), last: addDays(week.last, 7) }
}

export function monthOf(day: Day): DayRange {
  return { first: `${day.slice(0, 7)}-01`, last: lastDayOfMonth(day) }
}

export function monthBefore(month: DayRange): DayRange {
  return monthOf(addDays(month.first, -1))
}

export function monthAfter(month: DayRange): DayRange {
  return monthOf(addDays(month.last, 1))
}

export function earliestTrackedDay(trackedTime: TrackedTime): Day | null {
  const days = Object.values(trackedTime).flatMap((trackedDays) => Object.keys(trackedDays))
  return days.length === 0 ? null : days.reduce((earliest, day) => (day < earliest ? day : earliest))
}

/** Whether the range holds any day from the earliest tracked day up to today, or holds today when nothing is tracked yet. */
export function isAvailable(range: DayRange, earliestTrackedDay: Day | null, today: Day): boolean {
  return range.first <= today && range.last >= (earliestTrackedDay ?? today)
}

export function dayProgressOf(trackedTime: TrackedTime, task: PlannedTask, day: Day): DayProgress {
  const tracked = trackedOn(trackedTime, task.id, day)
  return { tracked, planned: task.plannedTime, fraction: tracked / task.plannedTime }
}

/** Of what is kept per task, only what belongs to the tasks of the filter, or all of it when the filter chooses none. */
export function narrowedTo<Kept>(byTask: Readonly<Record<string, Kept>>, filter: TaskFilter): Readonly<Record<string, Kept>> {
  if (filter.length === 0) {
    return byTask
  }
  return Object.fromEntries(Object.entries(byTask).filter(([taskId]) => filter.includes(taskId)))
}

/** A task the filter offers, with its name, or null as its name when it has been removed. */
export type FilterChoice = Readonly<{ taskId: string, name: string | null }>

/** The tasks the filter offers: every task in the order given, then each removed task that has tracked time or repeat day results. */
export function filterChoicesOf(trackedTime: TrackedTime, results: RepeatDayResults, tasks: readonly NamedTask[]): FilterChoice[] {
  const removedIds = new Set([...Object.keys(trackedTime), ...Object.keys(results)].filter((taskId) => !tasks.some((task) => task.id === taskId)))
  return [
    ...tasks.map((task) => ({ taskId: task.id, name: task.name })),
    ...[...removedIds].sort().map((taskId) => ({ taskId, name: null }))
  ]
}

/** The repeat day results of one task in a range, the earliest day first, and how many of them were finished. */
export type TaskRepeatDays = Readonly<{
  taskId: string
  /** The task's name, or null when the task has been removed. */
  name: string | null
  finished: number
  days: readonly (Readonly<{ day: Day }> & RepeatDayResult)[]
}>

/** The repeat day results in the range of each task that has any, the tasks in the order given and removed tasks after them. */
export function repeatDaysIn(results: RepeatDayResults, range: DayRange, tasks: readonly NamedTask[]): TaskRepeatDays[] {
  return Object.entries(results)
    .map(([taskId, byDay]) => {
      const days = Object.entries(byDay)
        .filter(([day]) => range.first <= day && day <= range.last)
        .sort(([one], [other]) => (one < other ? -1 : 1))
        .map(([day, result]) => ({ day, ...result }))
      const name = tasks.find((task) => task.id === taskId)?.name ?? null
      return { taskId, name, finished: days.filter(({ finished }) => finished).length, days }
    })
    .filter(({ days }) => days.length > 0)
    .sort((one, other) => compareTasks(one.taskId, other.taskId, tasks))
}

function taskTotalsOver(trackedTime: TrackedTime, days: readonly Day[], tasks: readonly NamedTask[]): TaskTotal[] {
  return Object.entries(trackedTime)
    .map(([taskId, trackedDays]) => ({
      taskId,
      name: tasks.find((task) => task.id === taskId)?.name ?? null,
      tracked: days.reduce((sum, day) => sum + (trackedDays[day] ?? 0), 0)
    }))
    .filter((total) => total.tracked > 0)
    .sort((one, other) => other.tracked - one.tracked || compareTasks(one.taskId, other.taskId, tasks))
}

/** Orders tasks as they come in the tasks, with removed tasks after them ordered by id. */
function compareTasks(oneId: string, otherId: string, tasks: readonly NamedTask[]): number {
  const positionOf = (taskId: string) => {
    const position = tasks.findIndex((task) => task.id === taskId)
    return position === -1 ? tasks.length : position
  }
  return positionOf(oneId) - positionOf(otherId) || (oneId < otherId ? -1 : oneId > otherId ? 1 : 0)
}

function sumOf(totals: readonly Readonly<{ tracked: Duration }>[]): Duration {
  return totals.reduce((sum, total) => sum + total.tracked, 0)
}

function daysOf(range: DayRange): Day[] {
  const days: Day[] = []
  for (let day = range.first; day <= range.last; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}
