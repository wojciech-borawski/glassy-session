import { isRecord } from '@/utils/is-record'
import { isSound } from '../sound/model/sound'
import type { AlarmDays, AlarmDetails, NewAlarm } from './model/alarm'

export type AlarmCommand =
  | Readonly<{ type: 'add', alarm: NewAlarm }>
  | Readonly<{ type: 'change', alarmId: string, details: AlarmDetails }>
  | Readonly<{ type: 'remove' | 'switchOn' | 'switchOff', alarmId: string }>

const COMMANDS_FOR_A_STORED_ALARM: readonly unknown[] = ['remove', 'switchOn', 'switchOff']

function isAlarmDays(value: unknown): value is AlarmDays {
  if (!isRecord(value)) {
    return false
  }
  if (value.kind === 'one-time') {
    return typeof value.date === 'string'
  }
  return value.kind === 'repeating' && Array.isArray(value.repeatDays) && value.repeatDays.every((day) => typeof day === 'number')
}

function isAlarmDetails(value: unknown): value is AlarmDetails {
  return isRecord(value)
    && typeof value.name === 'string'
    && typeof value.time === 'number'
    && isAlarmDays(value.days)
    && typeof value.sendsNotification === 'boolean'
    && (value.ringSound === undefined || isSound(value.ringSound))
}

/**
 * Tells an alarm command apart from any other message, timer and focus session commands included, which may come from anywhere and have any shape.
 * It checks the shape only. The alarm model still refuses an alarm without a name or a repeating alarm without repeat days.
 */
export function isAlarmCommand(message: unknown): message is AlarmCommand {
  if (!isRecord(message)) {
    return false
  }
  if (message.type === 'add') {
    return isRecord(message.alarm) && typeof message.alarm.id === 'string' && isAlarmDetails(message.alarm)
  }
  if (typeof message.alarmId !== 'string') {
    return false
  }
  if (message.type === 'change') {
    return isAlarmDetails(message.details)
  }
  return COMMANDS_FOR_A_STORED_ALARM.includes(message.type)
}
