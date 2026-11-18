import { lastTimeOf, recordRepeatDays, type ComingBack } from './repeat-day-results'

const MINUTE = 60_000

/** A task that repeats on Monday and Wednesday, used on Monday 2026-11-16. */
const gym: ComingBack = { taskId: 'gym', repeatDays: [1, 3], plannedTime: 60 * MINUTE, since: '2026-11-16', finishedOn: null }

describe('repeat day results', () => {
  test('a task used on Monday that comes back on Wednesday keeps how Monday went: its planned time, the time tracked and that it was not finished', () => {
    const results = recordRepeatDays({}, gym, { gym: { '2026-11-16': 40 * MINUTE } }, '2026-11-18')

    expect(results).toEqual({ gym: { '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false } } })
  })

  test('a task that comes back only after several repeat days keeps each of them, the missed ones with nothing tracked and not finished, but not the repeat day of today', () => {
    const results = recordRepeatDays({}, gym, { gym: { '2026-11-16': 40 * MINUTE } }, '2026-11-25')

    expect(results).toEqual({
      gym: {
        '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false },
        '2026-11-18': { planned: 60 * MINUTE, tracked: 0, finished: false },
        '2026-11-23': { planned: 60 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a task finished on Monday keeps Monday as finished and the repeat days it missed after it as not finished', () => {
    const results = recordRepeatDays({}, { ...gym, finishedOn: '2026-11-16' }, { gym: { '2026-11-16': 60 * MINUTE } }, '2026-11-23')

    expect(results).toEqual({
      gym: {
        '2026-11-16': { planned: 60 * MINUTE, tracked: 60 * MINUTE, finished: true },
        '2026-11-18': { planned: 60 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a task skipped on Monday keeps Monday as skipped, not finished, with the time tracked before the skip', () => {
    const results = recordRepeatDays({}, { ...gym, finishedOn: '2026-11-16', skipped: true }, { gym: { '2026-11-16': 40 * MINUTE } }, '2026-11-18')

    expect(results).toEqual({ gym: { '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false, skipped: true } } })
  })

  test('a task used and finished on Tuesday, between its repeat days, counts for Monday with the time tracked from Monday up to Wednesday', () => {
    const tuesday = { ...gym, since: '2026-11-17', finishedOn: '2026-11-17' }

    const results = recordRepeatDays({}, tuesday, { gym: { '2026-11-16': 10 * MINUTE, '2026-11-17': 50 * MINUTE, '2026-11-18': 5 * MINUTE } }, '2026-11-18')

    expect(results).toEqual({ gym: { '2026-11-16': { planned: 60 * MINUTE, tracked: 60 * MINUTE, finished: true } } })
  })

  test('on a repeat day, the last time is how the repeat day before it went', () => {
    const results = { gym: { '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false } } }

    expect(lastTimeOf(results, 'gym', [1, 3], '2026-11-18')).toEqual({ planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false })
  })

  test('on a day that is not a repeat day there is no last time', () => {
    const results = { gym: { '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false } } }

    expect(lastTimeOf(results, 'gym', [1, 3], '2026-11-17')).toBeNull()
  })
})
