import type { Duration } from './units'

const MINUTE = 60_000

const twoDigits = (value: number) => String(value).padStart(2, '0')

/** A time of day, given in milliseconds after midnight, as a 24-hour clock shows it: 07:05. Seconds are left out. */
export function formatTimeOfDay(time: Duration): string {
  const minutes = Math.floor(time / MINUTE)
  return `${twoDigits(Math.floor(minutes / 60))}:${twoDigits(minutes % 60)}`
}

/** The time of day a time field gives as HH:mm, in milliseconds after midnight, or null when the text is no such time. */
export function parseTimeOfDay(text: string): Duration | null {
  const parts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text)
  return parts === null ? null : (Number(parts[1]) * 60 + Number(parts[2])) * MINUTE
}
