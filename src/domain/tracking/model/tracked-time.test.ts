import type { DayOf } from '@/utils/time/calendar'
import { recordSpan, trackedByDay, trackedOn } from './tracked-time'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONDAY = 0

/** Days of exactly 24 hours, the first one 2026-11-16 starting at moment 0. */
const dayOf: DayOf = (moment) => {
  const index = Math.floor(moment / DAY)
  return { day: `2026-11-${16 + index}`, endsAt: (index + 1) * DAY }
}

describe('tracked time', () => {
  test('a span within one day is tracked on that day', () => {
    const tracked = recordSpan({}, 'write-report', { from: MONDAY + 9 * HOUR, to: MONDAY + 9 * HOUR + 25 * MINUTE }, dayOf)

    expect(trackedOn(tracked, 'write-report', '2026-11-16')).toBe(25 * MINUTE)
  })

  test('spans of one task on the same day add up', () => {
    const morning = recordSpan({}, 'write-report', { from: MONDAY + 9 * HOUR, to: MONDAY + 9 * HOUR + 25 * MINUTE }, dayOf)
    const afternoon = recordSpan(morning, 'write-report', { from: MONDAY + 14 * HOUR, to: MONDAY + 14 * HOUR + 10 * MINUTE }, dayOf)

    expect(trackedOn(afternoon, 'write-report', '2026-11-16')).toBe(35 * MINUTE)
  })

  test('a task that never ran has no tracked time on any day', () => {
    expect(trackedOn({}, 'write-report', '2026-11-16')).toBe(0)
  })

  test('a task that never ran has no tracked days', () => {
    expect(trackedByDay({}, 'write-report')).toEqual({})
  })

  test('a span across midnight is split between both days', () => {
    const tracked = recordSpan({}, 'write-report', { from: MONDAY + 23 * HOUR + 40 * MINUTE, to: MONDAY + DAY + 15 * MINUTE }, dayOf)

    expect(trackedByDay(tracked, 'write-report')).toEqual({ '2026-11-16': 20 * MINUTE, '2026-11-17': 15 * MINUTE })
  })

  test('a span that covers three days gives the middle day all of its hours', () => {
    const tracked = recordSpan({}, 'write-report', { from: MONDAY + 22 * HOUR, to: MONDAY + 2 * DAY + 3 * HOUR }, dayOf)

    expect(trackedByDay(tracked, 'write-report')).toEqual({ '2026-11-16': 2 * HOUR, '2026-11-17': 24 * HOUR, '2026-11-18': 3 * HOUR })
  })

  test('a zero-length span leaves tracked time as it was', () => {
    const tracked = recordSpan({}, 'read-mail', { from: MONDAY + 8 * HOUR, to: MONDAY + 8 * HOUR + 5 * MINUTE }, dayOf)

    expect(recordSpan(tracked, 'write-report', { from: MONDAY + 9 * HOUR, to: MONDAY + 9 * HOUR }, dayOf)).toEqual({ 'read-mail': { '2026-11-16': 5 * MINUTE } })
  })

  test('a span that ends before it starts leaves tracked time as it was', () => {
    const tracked = recordSpan({}, 'read-mail', { from: MONDAY + 8 * HOUR, to: MONDAY + 8 * HOUR + 5 * MINUTE }, dayOf)

    expect(recordSpan(tracked, 'write-report', { from: MONDAY + 9 * HOUR, to: MONDAY + 8 * HOUR }, dayOf)).toEqual({ 'read-mail': { '2026-11-16': 5 * MINUTE } })
  })
})
