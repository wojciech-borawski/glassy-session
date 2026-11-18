import { formatCountdown, formatHoursAndMinutes } from './format-duration'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

describe('a duration as a countdown', () => {
  test.each([
    [25 * MINUTE, '25:00'],
    [3 * MINUTE + 5 * SECOND, '03:05'],
    [HOUR + 5 * MINUTE + 9 * SECOND, '1:05:09'],
    [12 * HOUR, '12:00:00'],
    [0, '00:00']
  ])('%d ms reads %s', (duration, expected) => {
    expect(formatCountdown(duration)).toBe(expected)
  })

  test.each([
    [25 * MINUTE - 500, '25:00'],
    [400, '00:01']
  ])('a part of a second counts as a whole one, so %d ms reads %s and only nothing left reads 00:00', (duration, expected) => {
    expect(formatCountdown(duration)).toBe(expected)
  })
})

describe('a duration in hours and minutes', () => {
  test.each([
    [25 * MINUTE, '25m'],
    [4 * HOUR, '4h'],
    [HOUR + 30 * MINUTE, '1h 30m'],
    [0, '0m']
  ])('%d ms reads %s', (duration, expected) => {
    expect(formatHoursAndMinutes(duration)).toBe(expected)
  })
})
