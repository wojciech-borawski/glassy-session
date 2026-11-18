import { isRecord } from '@/utils/is-record'
import type { FocusSessionSettings, NewFocusSession } from './model/focus-session'
import type { Order } from './model/plan'

export type SessionCommand =
  | Readonly<{ type: 'add', session: NewFocusSession }>
  | Readonly<{ type: 'change', sessionId: string, settings: FocusSessionSettings }>
  | Readonly<{ type: 'remove' | 'start' | 'pause' | 'resume' | 'skip' | 'endEarly' | 'pin' | 'unpin', sessionId: string }>
  | Readonly<{ type: 'moveStep', sessionId: string, from: number, to: number }>
  | Readonly<{ type: 'sendToFront', sessionId: string, step: number }>
  | Readonly<{ type: 'addTaskSteps' | 'markTaskDone', sessionId: string, taskId: string }>

const COMMANDS_FOR_A_STORED_SESSION: readonly unknown[] = ['remove', 'start', 'pause', 'resume', 'skip', 'endEarly', 'pin', 'unpin']

const ORDERS: readonly unknown[] = ['one after another', 'alternating'] satisfies Order[]

function isSettings(value: unknown): value is FocusSessionSettings {
  return isRecord(value)
    && typeof value.name === 'string'
    && Array.isArray(value.taskIds) && value.taskIds.every((taskId) => typeof taskId === 'string')
    && typeof value.stepLength === 'number'
    && typeof value.breakLength === 'number'
    && ORDERS.includes(value.order)
    && (value.pinned === undefined || typeof value.pinned === 'boolean')
}

/**
 * Tells a focus session command apart from any other message, timer commands included, which may come from anywhere and have any shape.
 * It checks the shape only. The focus session model still refuses a session without a name or a positive step length.
 */
export function isSessionCommand(message: unknown): message is SessionCommand {
  if (!isRecord(message)) {
    return false
  }
  if (message.type === 'add') {
    return isRecord(message.session) && typeof message.session.id === 'string' && isSettings(message.session)
  }
  if (typeof message.sessionId !== 'string') {
    return false
  }
  switch (message.type) {
  case 'change':
    return isSettings(message.settings)
  case 'moveStep':
    return typeof message.from === 'number' && typeof message.to === 'number'
  case 'sendToFront':
    return typeof message.step === 'number'
  case 'addTaskSteps':
  case 'markTaskDone':
    return typeof message.taskId === 'string'
  default:
    return COMMANDS_FOR_A_STORED_SESSION.includes(message.type)
  }
}
