import { formatClockTime } from './format-clock-time'

const originalTimeZone = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'Europe/Warsaw'
})

afterAll(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTimeZone
  }
})

describe('a moment as the local clock shows it', () => {
  test.each([
    [Date.UTC(2026, 10, 17, 9, 5), '10:05'],
    [Date.UTC(2026, 10, 17, 22, 59, 59), '23:59'],
    [Date.UTC(2026, 10, 17, 23, 0), '00:00'],
    [Date.UTC(2026, 6, 1, 9, 30), '11:30']
  ])('%d reads %s, in hours and minutes of the day', (moment, expected) => {
    expect(formatClockTime(moment)).toBe(expected)
  })
})
