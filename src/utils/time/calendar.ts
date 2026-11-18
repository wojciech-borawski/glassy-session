import type { Moment } from './units'

/** A local calendar day written as YYYY-MM-DD. */
export type Day = string

/** Gives the day a moment falls on and the first moment of the day after it. */
export type DayOf = (moment: Moment) => { day: Day, endsAt: Moment }

/** A day of the week, from 0 for Sunday to 6 for Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function addDays(day: Day, count: number): Day {
  const date = utcDateOf(day)
  date.setUTCDate(date.getUTCDate() + count)
  return dayOfDate(date)
}

export function weekdayOf(day: Day): Weekday {
  return utcDateOf(day).getUTCDay() as Weekday
}

export function lastDayOfMonth(day: Day): Day {
  const date = utcDateOf(day)
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return dayOfDate(date)
}

/**
 * The milliseconds from 1970-01-01 00:00 to the start of the day, counting every day as 24 hours,
 * or null when the text is not a real date written as YYYY-MM-DD.
 */
export function parseDay(text: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (parts === null) {
    return null
  }
  const midnight = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
  return dayOfDate(new Date(midnight)) === text ? midnight : null
}

/** The calendar date of a day, at midnight in UTC so that no time zone shifts it. */
function utcDateOf(day: Day): Date {
  return new Date(`${day}T00:00:00Z`)
}

function dayOfDate(utcDate: Date): Day {
  return utcDate.toISOString().slice(0, 10)
}

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}
