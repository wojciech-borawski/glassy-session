import { afterRinging, changeAlarm, createAlarm, nextRingAfter, ringsDuring, ringsLeftToday, settle, switchOff, switchOn, type NewAlarm, type UtcOffsetAt } from './alarm'
import type { Weekday } from '@/utils/time/calendar'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** A clock one hour ahead of UTC all year, like Warsaw in winter. */
const oneHourAhead: UtcOffsetAt = () => HOUR

/** Warsaw in 2026: clocks go from 02:00 to 03:00 on 29 March and from 03:00 back to 02:00 on 25 October, both at 01:00 UTC. */
const warsaw2026: UtcOffsetAt = (moment) =>
  moment >= Date.UTC(2026, 2, 29, 1) && moment < Date.UTC(2026, 9, 25, 1) ? 2 * HOUR : HOUR

/** Tuesday 17 November 2026, 10:00 on a clock one hour ahead of UTC. */
const TUESDAY_TEN = Date.UTC(2026, 10, 17, 9)

const wakeUpOnWorkdays: NewAlarm = { id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true }

describe('creating an alarm', () => {
  test('a new alarm is switched on and keeps what it was given', () => {
    expect(createAlarm(wakeUpOnWorkdays)).toEqual({
      id: 'wake-up',
      name: 'Wake up',
      time: 7 * HOUR,
      days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] },
      sendsNotification: true,
      switchedOn: true
    })
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('an alarm whose name is %s is refused', (_, name) => {
    expect(() => createAlarm({ ...wakeUpOnWorkdays, name })).toThrow('name')
  })

  test.each([
    ['negative', -MINUTE],
    ['a whole day or more', 24 * HOUR],
    ['not a whole number of milliseconds', 0.5],
    ['not a number', NaN]
  ])('an alarm whose time is %s is refused', (_, time) => {
    expect(() => createAlarm({ ...wakeUpOnWorkdays, time })).toThrow('time of day')
  })

  test('a repeating alarm with no repeat days is refused', () => {
    expect(() => createAlarm({ ...wakeUpOnWorkdays, days: { kind: 'repeating', repeatDays: [] } })).toThrow('repeat day')
  })

  test.each([
    ['after Saturday', 7],
    ['before Sunday', -1],
    ['not a whole number', 1.5]
  ])('a repeat day %s is refused', (_, day) => {
    const repeatDays = [1, day] as Weekday[]

    expect(() => createAlarm({ ...wakeUpOnWorkdays, days: { kind: 'repeating', repeatDays } })).toThrow('repeat day')
  })

  test('repeat days are kept once each, in week order from Sunday', () => {
    const alarm = createAlarm({ ...wakeUpOnWorkdays, days: { kind: 'repeating', repeatDays: [5, 1, 5, 0] } })

    expect(alarm.days).toEqual({ kind: 'repeating', repeatDays: [0, 1, 5] })
  })

  test.each([
    ['a day that no month has', '2026-02-30'],
    ['written another way', '17.11.2026'],
    ['empty', '']
  ])('a one-time alarm whose date is %s is refused', (_, date) => {
    expect(() => createAlarm({ ...wakeUpOnWorkdays, days: { kind: 'one-time', date } })).toThrow('date')
  })
})

describe('the next ring of an alarm', () => {
  test('a one-time alarm rings on its date at its time on the local clock', () => {
    const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false })

    expect(nextRingAfter(dentist, TUESDAY_TEN, oneHourAhead)).toBe(Date.UTC(2026, 10, 17, 14))
  })

  test.each([
    ['a time already past today', '2026-11-17', 8 * HOUR],
    ['a date in the past', '2026-11-16', 15 * HOUR],
    ['exactly the moment asked about', '2026-11-17', 10 * HOUR]
  ])('a one-time alarm set for %s does not ring', (_, date, time) => {
    const missed = createAlarm({ id: 'missed', name: 'Missed', time, days: { kind: 'one-time', date }, sendsNotification: false })

    expect(nextRingAfter(missed, TUESDAY_TEN, oneHourAhead)).toBeNull()
  })

  test('a repeating alarm whose time already passed today rings at that time on the next repeat day', () => {
    expect(nextRingAfter(createAlarm(wakeUpOnWorkdays), TUESDAY_TEN, oneHourAhead)).toBe(Date.UTC(2026, 10, 18, 6))
  })

  test.each([
    ['later the same day', Date.UTC(2026, 10, 21, 5), Date.UTC(2026, 10, 21, 6)],
    ['from Saturday after its time, over the week border to Monday', Date.UTC(2026, 10, 21, 7), Date.UTC(2026, 10, 23, 6)],
    ['from Monday after its time, almost a week ahead to Saturday', Date.UTC(2026, 10, 23, 7), Date.UTC(2026, 10, 28, 6)]
  ])('an alarm repeating on Saturdays and Mondays rings %s', (_, after, ring) => {
    const gym = createAlarm({ id: 'gym', name: 'Gym', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [6, 1] }, sendsNotification: true })

    expect(nextRingAfter(gym, after, oneHourAhead)).toBe(ring)
  })

  test('on a clock behind UTC an alarm rings on the local day, which starts later than the UTC day', () => {
    const fiveHoursBehind: UtcOffsetAt = () => -5 * HOUR
    const mondayNinePm = Date.UTC(2026, 10, 17, 2)

    expect(nextRingAfter(createAlarm(wakeUpOnWorkdays), mondayNinePm, fiveHoursBehind)).toBe(Date.UTC(2026, 10, 17, 12))
  })

  test('an alarm repeating on one day rings a full week later when asked at its own ring', () => {
    const review = createAlarm({ id: 'review', name: 'Weekly review', time: 10 * HOUR, days: { kind: 'repeating', repeatDays: [2] }, sendsNotification: true })

    expect(nextRingAfter(review, TUESDAY_TEN, oneHourAhead)).toBe(Date.UTC(2026, 10, 24, 9))
  })
})

describe('changing an alarm', () => {
  test('a changed alarm keeps its id and whether it is switched on', () => {
    const changed = changeAlarm(switchOff(createAlarm(wakeUpOnWorkdays)), { name: 'Get up', time: 6.5 * HOUR, days: { kind: 'repeating', repeatDays: [6] }, sendsNotification: false })

    expect(changed).toEqual({ id: 'wake-up', name: 'Get up', time: 6.5 * HOUR, days: { kind: 'repeating', repeatDays: [6] }, sendsNotification: false, switchedOn: false })
  })

  test.each([
    ['an empty name', { name: '' }, 'name'],
    ['a time outside the day', { time: 25 * HOUR }, 'time of day'],
    ['no repeat days', { days: { kind: 'repeating', repeatDays: [] } }, 'repeat day'],
    ['a date that does not exist', { days: { kind: 'one-time', date: '2026-13-01' } }, 'date']
  ] as const)('a change to %s is refused', (_, changes, message) => {
    expect(() => changeAlarm(createAlarm(wakeUpOnWorkdays), changes)).toThrow(message)
  })
})

describe('switching an alarm on and off', () => {
  test('a switched off alarm does not ring', () => {
    expect(nextRingAfter(switchOff(createAlarm(wakeUpOnWorkdays)), TUESDAY_TEN, oneHourAhead)).toBeNull()
  })

  test('an alarm switched on again rings as before', () => {
    const alarm = switchOn(switchOff(createAlarm(wakeUpOnWorkdays)))

    expect(nextRingAfter(alarm, TUESDAY_TEN, oneHourAhead)).toBe(Date.UTC(2026, 10, 18, 6))
  })
})

describe('after an alarm rings', () => {
  test('a one-time alarm that rang is kept, switched off, with the date it had', () => {
    const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false })

    expect(afterRinging(dentist)).toEqual({ ...dentist, switchedOn: false })
  })

  test('a repeating alarm that rang stays switched on for its next repeat day', () => {
    const wakeUp = createAlarm(wakeUpOnWorkdays)

    expect(afterRinging(wakeUp)).toEqual(wakeUp)
  })
})

describe('the rings due in a span', () => {
  test('a workday alarm due while the browser was closed from Friday to Tuesday morning rang on Monday and Tuesday', () => {
    const closed = { from: Date.UTC(2026, 10, 20, 7), to: Date.UTC(2026, 10, 24, 7) }

    expect(ringsDuring(createAlarm(wakeUpOnWorkdays), closed, oneHourAhead)).toEqual([Date.UTC(2026, 10, 23, 6), Date.UTC(2026, 10, 24, 6)])
  })

  test('a ring at the very end of the span is due, and one at its very start is not', () => {
    const wednesdaySeven = Date.UTC(2026, 10, 18, 6)
    const thursdaySeven = Date.UTC(2026, 10, 19, 6)

    expect(ringsDuring(createAlarm(wakeUpOnWorkdays), { from: wednesdaySeven, to: thursdaySeven }, oneHourAhead)).toEqual([thursdaySeven])
  })

  test('a switched off alarm has no rings due', () => {
    const week = { from: TUESDAY_TEN, to: TUESDAY_TEN + 7 * 24 * HOUR }

    expect(ringsDuring(switchOff(createAlarm(wakeUpOnWorkdays)), week, oneHourAhead)).toEqual([])
  })

  test('a one-time alarm due in the span rang once', () => {
    const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false })
    const week = { from: TUESDAY_TEN, to: TUESDAY_TEN + 7 * 24 * HOUR }

    expect(ringsDuring(dentist, week, oneHourAhead)).toEqual([Date.UTC(2026, 10, 17, 14)])
  })
})

describe('daylight saving changes', () => {
  test('a time the clocks skip when they go forward rings by the clock from before the change, at 03:30 for 02:30', () => {
    const night = createAlarm({ id: 'night', name: 'Night shift', time: 2.5 * HOUR, days: { kind: 'one-time', date: '2026-03-29' }, sendsNotification: false })

    expect(nextRingAfter(night, Date.UTC(2026, 2, 28, 12), warsaw2026)).toBe(Date.UTC(2026, 2, 29, 1, 30))
  })

  test('a time after the clocks went forward rings at that time on the new clock', () => {
    const brunch = createAlarm({ id: 'brunch', name: 'Brunch', time: 10 * HOUR, days: { kind: 'one-time', date: '2026-03-29' }, sendsNotification: false })

    expect(nextRingAfter(brunch, Date.UTC(2026, 2, 28, 12), warsaw2026)).toBe(Date.UTC(2026, 2, 29, 8))
  })

  test('a time that happens twice when the clocks go back rings the first time', () => {
    const night = createAlarm({ id: 'night', name: 'Night shift', time: 2.5 * HOUR, days: { kind: 'one-time', date: '2026-10-25' }, sendsNotification: false })

    expect(nextRingAfter(night, Date.UTC(2026, 9, 24, 12), warsaw2026)).toBe(Date.UTC(2026, 9, 25, 0, 30))
  })

  test('a repeating alarm at a time that happens twice rings once that day', () => {
    const night = createAlarm({ id: 'night', name: 'Night shift', time: 2.5 * HOUR, days: { kind: 'repeating', repeatDays: [0] }, sendsNotification: false })
    const changeDay = { from: Date.UTC(2026, 9, 24, 22), to: Date.UTC(2026, 9, 25, 23) }

    expect(ringsDuring(night, changeDay, warsaw2026)).toEqual([Date.UTC(2026, 9, 25, 0, 30)])
  })

  test('a repeating alarm at a time the clocks skip still rings that day', () => {
    const night = createAlarm({ id: 'night', name: 'Night shift', time: 2.5 * HOUR, days: { kind: 'repeating', repeatDays: [0] }, sendsNotification: false })
    const changeDay = { from: Date.UTC(2026, 2, 28, 23), to: Date.UTC(2026, 2, 29, 22) }

    expect(ringsDuring(night, changeDay, warsaw2026)).toEqual([Date.UTC(2026, 2, 29, 1, 30)])
  })
})

describe('settling an alarm up to now', () => {
  const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false })
  const dentistRing = Date.UTC(2026, 10, 17, 14)

  test('a ring that came a moment ago rings now, and a one-time alarm that rang is switched off', () => {
    const settled = settle(dentist, { from: dentistRing - MINUTE, to: dentistRing + 1_000 }, oneHourAhead)

    expect(settled).toEqual({ alarm: { ...dentist, switchedOn: false }, due: { at: dentistRing, missed: false } })
  })

  test('a ring due a minute ago still rings, and one due longer ago was missed, which switches a one-time alarm off as well', () => {
    const span = (to: number) => ({ from: dentistRing - HOUR, to })

    expect(settle(dentist, span(dentistRing + MINUTE), oneHourAhead).due).toEqual({ at: dentistRing, missed: false })
    expect(settle(dentist, span(dentistRing + MINUTE + 1), oneHourAhead)).toEqual({ alarm: { ...dentist, switchedOn: false }, due: { at: dentistRing, missed: true } })
  })

  test('a repeating alarm due several times while the browser was closed was missed once, at its latest ring, and stays switched on', () => {
    const wakeUp = createAlarm(wakeUpOnWorkdays)
    const closed = { from: Date.UTC(2026, 10, 20, 7), to: Date.UTC(2026, 10, 24, 7) }

    expect(settle(wakeUp, closed, oneHourAhead)).toEqual({ alarm: wakeUp, due: { at: Date.UTC(2026, 10, 24, 6), missed: true } })
  })

  test('an alarm with no ring due in the span stays as it was', () => {
    expect(settle(dentist, { from: dentistRing, to: dentistRing + HOUR }, oneHourAhead)).toEqual({ alarm: dentist, due: null })
  })
})

describe('the rings left today', () => {
  test('are those of switched on alarms still to come on the local day, the soonest first', () => {
    const daily = { kind: 'repeating', repeatDays: [0, 1, 2, 3, 4, 5, 6] } as const
    const late = createAlarm({ id: 'late', name: 'Late', time: 23 * HOUR + 30 * MINUTE, days: daily, sendsNotification: true })
    const lunch = createAlarm({ id: 'lunch', name: 'Lunch', time: 13 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
    const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false })
    const wakeUp = createAlarm(wakeUpOnWorkdays)
    const gym = createAlarm({ id: 'gym', name: 'Gym', time: 18 * HOUR, days: { kind: 'repeating', repeatDays: [6] }, sendsNotification: true })
    const windDown = switchOff(createAlarm({ id: 'wind-down', name: 'Wind down', time: 20 * HOUR, days: daily, sendsNotification: true }))

    expect(ringsLeftToday([late, wakeUp, dentist, gym, windDown, lunch], TUESDAY_TEN, oneHourAhead)).toEqual([
      { alarm: lunch, ringsAt: Date.UTC(2026, 10, 17, 12) },
      { alarm: dentist, ringsAt: Date.UTC(2026, 10, 17, 14) },
      { alarm: late, ringsAt: Date.UTC(2026, 10, 17, 22, 30) }
    ])
  })
})
