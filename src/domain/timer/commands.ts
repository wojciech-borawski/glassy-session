import { isRecord } from '@/utils/is-record'
import { isWeekday } from '@/utils/time/calendar'
import { colourNames } from '@/ui/colours'
import { isSound } from '../sound/model/sound'
import type { Appearance, NewTimer, TimerDetails } from './model/timer'

export type TimerCommand =
  | Readonly<{ type: 'add', timer: NewTimer }>
  | Readonly<{ type: 'change', timerId: string, details: TimerDetails }>
  | Readonly<{ type: 'start' | 'pause' | 'reset' | 'remove' | 'markDone' | 'undoDone' | 'pin' | 'unpin', timerId: string }>

const COMMANDS_FOR_A_STORED_TIMER: readonly unknown[] = ['start', 'pause', 'reset', 'remove', 'markDone', 'undoDone', 'pin', 'unpin']

const KINDS: readonly unknown[] = ['timer', 'task'] satisfies NewTimer['kind'][]

function isAppearance(value: unknown): value is Appearance {
  return isRecord(value) && (colourNames as readonly unknown[]).includes(value.colour)
}

function isTimerDetails(value: unknown): value is TimerDetails {
  return isRecord(value)
    && typeof value.name === 'string'
    && (value.description === undefined || typeof value.description === 'string')
    && typeof value.plannedTime === 'number'
    && isAppearance(value.appearance)
    && (value.repeatDays === undefined || Array.isArray(value.repeatDays) && value.repeatDays.every(isWeekday))
    && (value.pinned === undefined || typeof value.pinned === 'boolean')
    && (value.ringSound === undefined || isSound(value.ringSound))
}

function isNewTimer(value: unknown): value is NewTimer {
  return isRecord(value)
    && typeof value.id === 'string'
    && KINDS.includes(value.kind)
    && isTimerDetails(value)
}

/**
 * Tells a timer command apart from any other message, which may come from anywhere and have any shape.
 * It checks the shape only. The timer model still refuses a timer without a name or a positive planned time.
 */
export function isTimerCommand(message: unknown): message is TimerCommand {
  if (!isRecord(message)) {
    return false
  }
  if (message.type === 'add') {
    return isNewTimer(message.timer)
  }
  if (typeof message.timerId !== 'string') {
    return false
  }
  if (message.type === 'change') {
    return isTimerDetails(message.details)
  }
  return COMMANDS_FOR_A_STORED_TIMER.includes(message.type)
}
