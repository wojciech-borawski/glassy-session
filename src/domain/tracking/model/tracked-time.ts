import type { Day, DayOf } from '@/utils/time/calendar'
import type { Duration, Span } from '@/utils/time/units'

export type TrackedDays = Readonly<Record<Day, Duration>>

export type TrackedTime = Readonly<Record<string, TrackedDays>>

export function recordSpan(trackedTime: TrackedTime, taskId: string, span: Span, dayOf: DayOf): TrackedTime {
  if (span.to <= span.from) {
    return trackedTime
  }
  const days = { ...trackedTime[taskId] }
  let from = span.from
  while (from < span.to) {
    const { day, endsAt } = dayOf(from)
    const to = Math.min(span.to, endsAt)
    days[day] = (days[day] ?? 0) + to - from
    from = to
  }
  return { ...trackedTime, [taskId]: days }
}

export function trackedOn(trackedTime: TrackedTime, taskId: string, day: Day): Duration {
  return trackedTime[taskId]?.[day] ?? 0
}

export function trackedByDay(trackedTime: TrackedTime, taskId: string): TrackedDays {
  return trackedTime[taskId] ?? {}
}
