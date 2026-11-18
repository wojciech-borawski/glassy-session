import { parseDay, type Day } from './calendar'

/** A day written by the locale with the parts asked for. It reads the calendar date alone, so no time zone shifts it. */
export function formatDay(day: Day, locale: string, parts: Intl.DateTimeFormatOptions): string {
  return formatterOf(locale, parts).format(midnightOf(day))
}

/** The days from first to last written by the locale as one range, so the parts they share are written once. */
export function formatDays(first: Day, last: Day, locale: string, parts: Intl.DateTimeFormatOptions): string {
  return formatterOf(locale, parts).formatRange(midnightOf(first), midnightOf(last))
}

function formatterOf(locale: string, parts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { ...parts, timeZone: 'UTC' })
}

function midnightOf(day: Day): number {
  const midnight = parseDay(day)
  if (midnight === null) throw new Error(`${day} is not a day`)
  return midnight
}
