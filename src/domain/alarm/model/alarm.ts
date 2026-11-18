import { isWeekday, parseDay, type Day, type Weekday } from '@/utils/time/calendar'
import type { Duration, Moment, Span } from '@/utils/time/units'
import type { Sound } from '../../sound/model/sound'

const DAY: Duration = 24 * 60 * 60_000

/** How long after its moment an alarm may still ring. A ring found later than that was missed while the browser could not ring. */
export const LATEST_RING: Duration = 60_000

/** A time of day as the local clock shows it, in milliseconds after 00:00. */
export type TimeOfDay = Duration

/**
 * What a local clock shows, as the milliseconds from 1970-01-01 00:00 to that date and time on the same clock.
 * It counts every day as 24 hours, so it is not a moment.
 */
type ClockReading = number

export type AlarmDays =
  | Readonly<{ kind: 'one-time', date: Day }>
  | Readonly<{ kind: 'repeating', repeatDays: readonly Weekday[] }>

export type Alarm = Readonly<{
  id: string
  name: string
  time: TimeOfDay
  days: AlarmDays
  sendsNotification: boolean
  /** The sound it rings with. An alarm saved before ring sounds could be chosen has none, and rings with the bell. */
  ringSound?: Sound
  switchedOn: boolean
}>

export type NewAlarm = Omit<Alarm, 'switchedOn'>

/** Everything the person sets on an alarm. */
export type AlarmDetails = Omit<NewAlarm, 'id'>

export type AlarmChanges = Partial<Omit<NewAlarm, 'id'>>

/** Gives how far the local clock is ahead of UTC at a moment, negative when it is behind. */
export type UtcOffsetAt = (moment: Moment) => Duration

export function createAlarm(input: NewAlarm): Alarm {
  return { ...checked(input), switchedOn: true }
}

export function changeAlarm(alarm: Alarm, changes: AlarmChanges): Alarm {
  return { ...checked({ ...alarm, ...changes }), switchedOn: alarm.switchedOn }
}

/** Whether the changes move a one-time alarm whose moment has passed to a moment still to come, which switches it on again. */
export function switchesOnWhenChanged(alarm: Alarm, changes: AlarmChanges, now: Moment, offsetAt: UtcOffsetAt): boolean {
  const changed = switchOn(changeAlarm(alarm, changes))
  return alarm.days.kind === 'one-time' && changed.days.kind === 'one-time'
    && nextRingAfter(switchOn(alarm), now, offsetAt) === null && nextRingAfter(changed, now, offsetAt) !== null
}

export function switchOn(alarm: Alarm): Alarm {
  return { ...alarm, switchedOn: true }
}

export function switchOff(alarm: Alarm): Alarm {
  return { ...alarm, switchedOn: false }
}

export function nextRingAfter(alarm: Alarm, after: Moment, offsetAt: UtcOffsetAt): Moment | null {
  if (!alarm.switchedOn) {
    return null
  }
  if (alarm.days.kind === 'one-time') {
    const ring = ringOnDate(alarm.days.date, alarm.time, offsetAt)
    return ring > after ? ring : null
  }
  const todayMidnight = Math.floor((after + offsetAt(after)) / DAY) * DAY
  for (let day = 0; day <= 7; day++) {
    const midnight = todayMidnight + day * DAY
    if (!alarm.days.repeatDays.includes(new Date(midnight).getUTCDay() as Weekday)) {
      continue
    }
    const ring = momentOf(midnight + alarm.time, offsetAt)
    if (ring > after) {
      return ring
    }
  }
  return null
}

/** The moment a one-time alarm with the time of day rings on the date, which must be a real date. */
export function ringOnDate(date: Day, time: TimeOfDay, offsetAt: UtcOffsetAt): Moment {
  return momentOf((parseDay(date) as ClockReading) + time, offsetAt)
}

export function ringsDuring(alarm: Alarm, span: Span, offsetAt: UtcOffsetAt): Moment[] {
  const rings: Moment[] = []
  let ring = nextRingAfter(alarm, span.from, offsetAt)
  while (ring !== null && ring <= span.to) {
    rings.push(ring)
    ring = nextRingAfter(alarm, ring, offsetAt)
  }
  return rings
}

export function afterRinging(alarm: Alarm): Alarm {
  return alarm.days.kind === 'one-time' ? switchOff(alarm) : alarm
}

/** The latest ring due in a span, and whether it came too long before the span's end to ring. */
export type Due = Readonly<{ at: Moment, missed: boolean }>

/** An alarm after a span, and the ring due in it, or null when none was. */
export type Settled = Readonly<{ alarm: Alarm, due: Due | null }>

/** Settles an alarm over the span since it was last settled up to now. */
export function settle(alarm: Alarm, span: Span, offsetAt: UtcOffsetAt): Settled {
  const latest = ringsDuring(alarm, span, offsetAt).at(-1)
  if (latest === undefined) {
    return { alarm, due: null }
  }
  return { alarm: afterRinging(alarm), due: { at: latest, missed: span.to - latest > LATEST_RING } }
}

/** A ring an alarm will give, and when. */
export type Ring = Readonly<{ alarm: Alarm, ringsAt: Moment }>

/** The rings of switched on alarms after now and before the local day ends, the soonest first. */
export function ringsLeftToday(alarms: readonly Alarm[], now: Moment, offsetAt: UtcOffsetAt): Ring[] {
  const endOfToday = momentOf(Math.floor((now + offsetAt(now)) / DAY) * DAY + DAY, offsetAt)
  return alarms
    .flatMap((alarm) => {
      const ringsAt = nextRingAfter(alarm, now, offsetAt)
      return ringsAt !== null && ringsAt < endOfToday ? [{ alarm, ringsAt }] : []
    })
    .sort((one, other) => one.ringsAt - other.ringsAt)
}

/**
 * The first moment the local clock shows the reading.
 * A reading the clocks skip when they go forward is read by the clock from before the change, as RFC 5545 does.
 */
function momentOf(reading: ClockReading, offsetAt: UtcOffsetAt): Moment {
  const byClockBefore = reading - offsetAt(reading - DAY)
  const byClockAfter = reading - offsetAt(reading + DAY)
  const shown = [byClockBefore, byClockAfter].filter(moment => moment + offsetAt(moment) === reading)
  return shown.length > 0 ? Math.min(...shown) : byClockBefore
}

function checked(input: NewAlarm): NewAlarm {
  if (input.name.trim() === '') {
    throw new RangeError('An alarm needs a name')
  }
  if (!Number.isInteger(input.time) || input.time < 0 || input.time >= DAY) {
    throw new RangeError(`An alarm needs a time of day from 00:00 up to 24:00, got ${input.time}`)
  }
  return { ...input, days: checkedDays(input.days) }
}

function checkedDays(days: AlarmDays): AlarmDays {
  if (days.kind === 'one-time') {
    if (parseDay(days.date) === null) {
      throw new RangeError(`A one-time alarm needs a date written as YYYY-MM-DD, got '${days.date}'`)
    }
    return days
  }
  if (days.repeatDays.length === 0) {
    throw new RangeError('A repeating alarm needs at least one repeat day')
  }
  if (days.repeatDays.some((day) => !isWeekday(day))) {
    throw new RangeError(`A repeat day is a weekday from 0 for Sunday to 6 for Saturday, got ${days.repeatDays.join(', ')}`)
  }
  return { kind: 'repeating', repeatDays: [...new Set(days.repeatDays)].sort((a, b) => a - b) }
}
