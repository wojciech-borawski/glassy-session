import type { AlarmRinger } from '@/domain/alarm/ports'
import type { Moment } from '@/utils/time/units'

export function createMemoryAlarmRinger(): AlarmRinger & { rang: readonly string[], missed: readonly { alarmId: string, dueAt: Moment }[] } {
  const rang: string[] = []
  const missed: { alarmId: string, dueAt: Moment }[] = []
  return {
    rang,
    missed,
    async ring(alarm) {
      rang.push(alarm.id)
    },
    async tellMissed(alarm, dueAt) {
      missed.push({ alarmId: alarm.id, dueAt })
    }
  }
}
