import { formatTimeOfDay, parseTimeOfDay } from './time-of-day'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('a time of day', () => {
  test.each([
    [0, '00:00'],
    [7 * HOUR + 5 * MINUTE, '07:05'],
    [23 * HOUR + 59 * MINUTE, '23:59']
  ])('%i ms after midnight reads %s on a 24-hour clock', (time, text) => {
    expect(formatTimeOfDay(time)).toBe(text)
  })

  test.each([
    ['00:00', 0],
    ['07:05', 7 * HOUR + 5 * MINUTE],
    ['23:59', 23 * HOUR + 59 * MINUTE]
  ])('%s from a time field is %i ms after midnight', (text, time) => {
    expect(parseTimeOfDay(text)).toBe(time)
  })

  test.each(['', '7:05', '24:00', '12:60', 'noon'])('%j is not a time of day', (text) => {
    expect(parseTimeOfDay(text)).toBeNull()
  })
})
