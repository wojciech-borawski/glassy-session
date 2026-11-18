import type { Refusal } from '@/domain/command/command-outcome'
import type { SessionCommand } from '@/domain/session/commands'
import { sendCommand } from './command-messages'

/** Sends a command to the background, which alone changes focus sessions. Resolves once the background has applied it, with the refusal when it changed nothing. */
export function sendSessionCommand(command: SessionCommand): Promise<Refusal | null> {
  return sendCommand(command)
}
