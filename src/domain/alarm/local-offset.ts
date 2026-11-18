import type { UtcOffsetAt } from './model/alarm'

export const localUtcOffsetAt: UtcOffsetAt = (moment) => -new Date(moment).getTimezoneOffset() * 60_000
