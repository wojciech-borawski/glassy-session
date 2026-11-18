import type { AlarmCommand } from '@/domain/alarm/commands'
import type { Refusal } from '@/domain/command/command-outcome'
import { failure } from '@/domain/command/command-outcome'
import type { MusicCommand, SoundCommand } from '@/domain/music/commands'
import type { SessionCommand } from '@/domain/session/commands'
import type { TimerCommand } from '@/domain/timer/commands'
import { isRecord } from '@/utils/is-record'

/** What the background answers a command with. Any other answer, or none, means the command did not run. */
type CommandAnswer = Readonly<{ refusal: Refusal | null }>

function isCommandAnswer(answer: unknown): answer is CommandAnswer {
  return isRecord(answer) && 'refusal' in answer
}

/** The background's answer to a command it runs. A command that throws answers with a failure, and the error goes to the background's console. */
export async function answerCommand(running: Promise<Refusal | null>): Promise<CommandAnswer> {
  try {
    return { refusal: await running }
  } catch (error) {
    console.error(error)
    return { refusal: failure(error) }
  }
}

/** Sends a command to the background. Resolves once it is applied with null, or with the refusal that says why it changed nothing, also when the background could not be reached. */
export async function sendCommand(command: TimerCommand | SessionCommand | AlarmCommand | MusicCommand | SoundCommand): Promise<Refusal | null> {
  try {
    const answer: unknown = await browser.runtime.sendMessage(command)
    return isCommandAnswer(answer) ? answer.refusal : failure(new Error('The background did not answer'))
  } catch (error) {
    return failure(error)
  }
}
