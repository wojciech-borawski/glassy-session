import type { DayOf } from '@/utils/time/calendar'
import type { Moment, Span } from '@/utils/time/units'
import type { Named, Ran, Refusal } from '../command/command-outcome'
import type { TimerCommand } from './commands'
import { createTimer, markDone, pause, pin, repeatsToday, reset, runStateAt, skipToday, start, undoDone, unpin, withDetails, type NewTimer, type Timer, type TimerDetails } from './model/timer'

/**
 * What a command leaves of the stored timers, and the spans it ended. A field left out stays as it was. A change that refuses itself gives the refusal.
 * `doneInRun` is a task the change made done while the run of a focus session uses it, which the runner takes out of that run.
 */
type TimerChange = Readonly<{ timers?: readonly Timer[], ran?: readonly Ran[], doneInRun?: string, refusal?: Refusal }>

/**
 * Runs a change on the stored timers in turn with every other command. Before the change, every timer and focus session that ran out
 * while nobody looked is settled, so the change sees them as they are now, and is told the focus session whose run uses each task, by task id.
 * The change is refused when it would use a task in two places.
 */
export type RunTimerChange = (now: Moment, change: (stored: Readonly<{ timers: readonly Timer[], usedInRun: ReadonlyMap<string, Named> }>) => TimerChange) => Promise<Refusal | null>

/** What a command leaves of a timer, null when it removes the timer, and the span it ended. */
type Outcome = Readonly<{ timer: Timer | null, ran: Span | null }>

/** What a command does to a timer, or why it refuses. */
type Command = (timer: Timer, now: Moment) => Outcome | Refusal

const removal: Command = (timer, now) => ({ timer: null, ran: pause(timer, now).ran })

/** Starts a timer that is idle or paused. One that already runs on its own, or has finished, is refused. */
const starting: Command = (timer, now) => {
  const named = { id: timer.id, name: timer.name }
  switch (runStateAt(timer, now)) {
  case 'running':
    return { reason: 'task in use', task: named, usedIn: null }
  case 'finished':
    return { reason: 'no time left', task: named }
  default:
    return start(timer, now)
  }
}

/**
 * The use cases the background runs on stored timers, through the runner it is given, so nothing is kept between calls.
 * A command for a timer id that is not stored is refused as already removed. Adding a timer whose id is already stored changes nothing.
 * Starting a timer that already runs on its own is refused as a task in use, and starting a finished one as having no time left.
 * Resetting, marking done or undoing done a task that the run of a focus session uses is refused, naming that session, since while
 * the run goes on only the session changes what the task has left. Skipping a repeating task today is not refused there: the runner takes
 * the task out of that run. Skipping a timer, a one-time task, or a repeating task on a day that is not one of its repeat days, the local
 * day of the moment given, is refused as not repeating today.
 */
export function createTimerEngine(run: RunTimerChange, dayOf: DayOf) {
  /** Skips a repeating task on one of its repeat days, the local day of the moment. Any other timer or day is refused as not repeating today. */
  const skipping: Command = (timer, now) => repeatsToday(timer, now, dayOf)
    ? skipToday(timer, now)
    : { reason: 'not repeating today', task: { id: timer.id, name: timer.name } }

  /** Changes the stored timer with the id. A task that the run of a focus session uses is refused, kept in the run, or taken out of the run as done, as `inRun` says. */
  function changeOne(command: Command, inRun: 'refused' | 'kept' | 'taken out as done' = 'kept') {
    return (timerId: string, now: Moment) => run(now, ({ timers, usedInRun }) => {
      const stored = timers.find((timer) => timer.id === timerId)
      if (stored === undefined) {
        return { refusal: { reason: 'already removed' } }
      }
      const usedIn = usedInRun.get(timerId)
      if (inRun === 'refused' && usedIn !== undefined) {
        return { refusal: { reason: 'task in use', task: { id: stored.id, name: stored.name }, usedIn } }
      }
      const outcome = command(stored, now)
      if ('reason' in outcome) {
        return { refusal: outcome }
      }
      const changed = timers.flatMap((timer) => timer.id !== timerId ? [timer] : outcome.timer === null ? [] : [outcome.timer])
      const ran: Ran[] = outcome.ran === null ? [] : [{ timerId, span: outcome.ran }]
      return inRun === 'taken out as done' && usedIn !== undefined ? { timers: changed, ran, doneInRun: timerId } : { timers: changed, ran }
    })
  }

  const engine = {
    add: (newTimer: NewTimer, now: Moment) => run(now, ({ timers }) => ({
      timers: timers.some((timer) => timer.id === newTimer.id) ? timers : [...timers, createTimer(newTimer, now)]
    })),
    change: (timerId: string, details: TimerDetails, now: Moment) => changeOne((timer) => withDetails(timer, details, now))(timerId, now),
    start: changeOne(starting),
    pause: changeOne(pause),
    reset: changeOne(reset, 'refused'),
    remove: changeOne(removal),
    markDone: changeOne(markDone, 'refused'),
    undoDone: changeOne(undoDone, 'refused'),
    skipToday: changeOne(skipping, 'taken out as done'),
    pin: changeOne(pin),
    unpin: changeOne(unpin),
    settleAll: (now: Moment) => run(now, () => ({}))
  }

  /** Runs the timer command with the use case it names. */
  function runCommand(command: TimerCommand, now: Moment) {
    switch (command.type) {
    case 'add':
      return engine.add(command.timer, now)
    case 'change':
      return engine.change(command.timerId, command.details, now)
    default:
      return engine[command.type](command.timerId, now)
    }
  }

  return { ...engine, run: runCommand }
}
