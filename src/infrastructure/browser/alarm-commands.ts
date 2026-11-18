import type { AlarmCommand } from '@/domain/alarm/commands'
import type { Refusal } from '@/domain/command/command-outcome'
import { sendCommand } from './command-messages'

/** Sends a command to the background, which alone changes alarms. Resolves once the background has applied it, with the refusal when it changed nothing. */
export function sendAlarmCommand(command: AlarmCommand): Promise<Refusal | null> {
  return sendCommand(command)
}
