import { localDayOf } from './local-day'

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

describe('the local calendar day of a moment', () => {
  test('an afternoon moment belongs to its local day, which ends at the next local midnight', () => {
    expect(localDayOf(Date.UTC(2026, 10, 17, 14, 30))).toEqual({ day: '2026-11-17', endsAt: Date.UTC(2026, 10, 17, 23) })
  })

  test('a moment just after local midnight belongs to the new local day while it is still the old day in UTC', () => {
    expect(localDayOf(Date.UTC(2026, 10, 17, 23, 30))).toEqual({ day: '2026-11-18', endsAt: Date.UTC(2026, 10, 18, 23) })
  })

  test('the day the clocks go forward ends 23 hours after it started', () => {
    expect(localDayOf(Date.UTC(2026, 2, 29, 10))).toEqual({ day: '2026-03-29', endsAt: Date.UTC(2026, 2, 29, 22) })
  })
})
