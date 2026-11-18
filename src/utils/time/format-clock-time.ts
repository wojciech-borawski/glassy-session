import type { Moment } from './units'

const twoDigits = (value: number) => String(value).padStart(2, '0')

/** A moment as the local clock shows it, in hours and minutes of a 24-hour day: 09:05. */
export function formatClockTime(moment: Moment): string {
  const date = new Date(moment)
  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`
}
