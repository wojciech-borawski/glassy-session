import type { AlarmRinger } from '@/domain/alarm/ports'
import { ringSoundOf } from '@/domain/sound/model/sound'
import { formatTimeOfDay } from '@/utils/time/time-of-day'
import { notify } from './notify'
import { playSound, type Sounding } from './play-sound'

/** The moment on the local clock, as the time and the day a missed notification names. */
function localTimeAndDay(moment: number) {
  const date = new Date(moment)
  return {
    time: date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    day: date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  }
}

/**
 * Rings with the alarm's ring sound, and with a system notification when the alarm sends one. A missed alarm shows a quiet notification and plays nothing.
 * Each alarm has one notification, so a later one replaces it.
 */
export function createBrowserAlarmRinger(sounding: Sounding): AlarmRinger {
  return {
    async ring(alarm) {
      if (alarm.sendsNotification) {
        await notify(`alarm:${alarm.id}`, alarm.name, 'alarmRing.due', { values: { time: formatTimeOfDay(alarm.time) } })
      }
      await playSound(sounding, () => ringSoundOf(alarm))
    },
    async tellMissed(alarm, dueAt) {
      await notify(`alarm:${alarm.id}`, alarm.name, 'alarmRing.missed', { values: localTimeAndDay(dueAt), quiet: true })
    }
  }
}
