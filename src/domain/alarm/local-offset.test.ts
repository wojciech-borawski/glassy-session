import { localUtcOffsetAt } from './local-offset'
import { createAlarm, nextRingAfter } from './model/alarm'

const HOUR = 60 * 60_000

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

describe('how far the local clock is ahead of UTC', () => {
  test('in winter the clock in Warsaw is one hour ahead', () => {
    expect(localUtcOffsetAt(Date.UTC(2026, 10, 17, 12))).toBe(HOUR)
  })

  test('in summer the clock in Warsaw is two hours ahead', () => {
    expect(localUtcOffsetAt(Date.UTC(2026, 6, 1, 12))).toBe(2 * HOUR)
  })

  test('the clock goes forward at 01:00 UTC on the last Sunday of March', () => {
    expect(localUtcOffsetAt(Date.UTC(2026, 2, 29, 1) - 1)).toBe(HOUR)
    expect(localUtcOffsetAt(Date.UTC(2026, 2, 29, 1))).toBe(2 * HOUR)
  })
})

describe('alarms on the clock in Warsaw', () => {
  const night = createAlarm({ id: 'night', name: 'Night shift', time: 2.5 * HOUR, days: { kind: 'repeating', repeatDays: [0] }, sendsNotification: false })

  test('an alarm at 02:30 on the day the clocks skip it rings at 03:30', () => {
    expect(nextRingAfter(night, Date.UTC(2026, 2, 28, 12), localUtcOffsetAt)).toBe(Date.UTC(2026, 2, 29, 1, 30))
  })

  test('an alarm at 02:30 on the day it happens twice rings the first time', () => {
    expect(nextRingAfter(night, Date.UTC(2026, 9, 24, 12), localUtcOffsetAt)).toBe(Date.UTC(2026, 9, 25, 0, 30))
  })
})
