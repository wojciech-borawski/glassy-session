import { addDays, lastDayOfMonth, parseDay, weekdayOf } from './calendar'

describe('adding days to a day', () => {
  test.each([
    ['2026-11-17', 1, '2026-11-18'],
    ['2026-11-30', 1, '2026-12-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-11-17', 0, '2026-11-17']
  ])('%s and %d days is %s', (day, count, expected) => {
    expect(addDays(day, count)).toBe(expected)
  })
})

describe('the weekday of a day', () => {
  test.each([
    ['2026-11-15', 0],
    ['2026-11-16', 1],
    ['2026-11-21', 6]
  ])('%s falls on weekday %d', (day, expected) => {
    expect(weekdayOf(day)).toBe(expected)
  })
})

describe('the last day of a month', () => {
  test.each([
    ['2026-11-17', '2026-11-30'],
    ['2026-12-01', '2026-12-31'],
    ['2026-02-10', '2026-02-28'],
    ['2028-02-10', '2028-02-29']
  ])('the month of %s ends on %s', (day, expected) => {
    expect(lastDayOfMonth(day)).toBe(expected)
  })
})

describe('parsing a day', () => {
  test('a date written as YYYY-MM-DD gives the milliseconds from 1970-01-01 to its start', () => {
    expect(parseDay('1970-01-02')).toBe(24 * 60 * 60_000)
    expect(parseDay('2026-11-17')).toBe(Date.UTC(2026, 10, 17))
  })

  test.each(['2026-02-30', '2026-13-01', '2026-1-05', '17.11.2026', '', '2026-11-17T00:00'])('%j is not a day', (text) => {
    expect(parseDay(text)).toBeNull()
  })
})
