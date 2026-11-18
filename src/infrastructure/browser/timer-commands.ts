import type { Refusal } from '@/domain/command/command-outcome'
import type { TimerCommand } from '@/domain/timer/commands'
import { sendCommand } from './command-messages'

/** Sends a command to the background, which alone changes timers. Resolves once the background has applied it, with the refusal when it changed nothing. */
export function sendTimerCommand(command: TimerCommand): Promise<Refusal | null> {
  return sendCommand(command)
}
