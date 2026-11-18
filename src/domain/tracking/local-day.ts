import type { DayOf } from '@/utils/time/calendar'

export const localDayOf: DayOf = (moment) => {
  const date = new Date(moment)
  const year = date.getFullYear()
  const month = date.getMonth()
  const dayOfMonth = date.getDate()
  const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`
  return { day, endsAt: new Date(year, month, dayOfMonth + 1).getTime() }
}
