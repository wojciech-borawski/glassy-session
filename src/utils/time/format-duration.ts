import type { Duration } from './units'

const SECOND = 1_000

const twoDigits = (value: number) => String(value).padStart(2, '0')

/** A duration as a countdown reads it: minutes and seconds, with hours in front once there are any. */
export function formatCountdown(duration: Duration): string {
  const seconds = Math.ceil(duration / SECOND)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const minutesAndSeconds = `${twoDigits(minutes)}:${twoDigits(seconds % 60)}`
  return hours > 0 ? `${hours}:${minutesAndSeconds}` : minutesAndSeconds
}

/** A duration to the nearest minute, as hours and minutes: 25m, 4h or 1h 30m. */
export function formatHoursAndMinutes(duration: Duration): string {
  const totalMinutes = Math.round(duration / (60 * SECOND))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes}m`
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
