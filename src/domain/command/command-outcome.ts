import type { Span } from '@/utils/time/units'
import type { SoundUser } from '../sound/model/sound-use'

/** A span a timer ran, to be tracked when the timer is a task. */
export type Ran = Readonly<{ timerId: string, span: Span }>

/** A timer or a focus session as a refusal names it. */
export type Named = Readonly<{ id: string, name: string }>

/**
 * Why a command changed nothing.
 * A task in use: the command would have used the task in a second place. `usedIn` is the focus session it is already in, or null when it already runs on its own.
 * Failed: the command could not run, for the reason in `message`.
 * Already removed: the command was for a timer or an alarm that is no longer stored.
 * Moment passed: the command would switch on a one-time alarm whose moment has already passed.
 * Not up next: the command changes up next by a step of a running focus session that has become the current step or a past one. `step` is its place in the run's plan, from 0.
 * Run ended: the command changes up next of a focus session that no longer has a run.
 * No time left: the command adds the steps of a task that has no remaining time to a focus session's run.
 * Not repeating today: the command skips today a timer, a one-time task, or a repeating task on a day that is not one of its repeat days.
 * Audio file in use: the command removes one of the person's own audio files that the timers, alarms, chimes and playlists in `usedBy` still play.
 */
export type Refusal =
  | Readonly<{ reason: 'task in use', task: Named, usedIn: Named | null }>
  | Readonly<{ reason: 'failed', message: string }>
  | Readonly<{ reason: 'already removed' }>
  | Readonly<{ reason: 'moment passed' }>
  | Readonly<{ reason: 'not up next', task: Named, step: number }>
  | Readonly<{ reason: 'run ended' }>
  | Readonly<{ reason: 'no time left', task: Named }>
  | Readonly<{ reason: 'not repeating today', task: Named }>
  | Readonly<{ reason: 'audio file in use', usedBy: readonly SoundUser[] }>

/** The refusal of a command that threw the error instead of finishing. */
export function failure(error: unknown): Refusal {
  return { reason: 'failed', message: error instanceof Error ? error.message : String(error) }
}
