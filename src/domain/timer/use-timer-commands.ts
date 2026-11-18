import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { whyRefused } from '../command/why-refused'
import type { TimerCommand } from './commands'
import type { Timer, TimerDetails } from './model/timer'
import { useStoredTimers } from './stored-timers'

/** Sends timer commands through the stored timers and says in the snackbar what each one did, or why it did nothing. */
export function useTimerCommands() {
  const { send } = useStoredTimers()
  const { show } = useSnackbar()
  const { t } = useI18n()

  async function run(command: TimerCommand, done: string): Promise<Refusal | null> {
    const refusal = await send(command)
    show(refusal === null ? done : whyRefused(refusal, t))
    return refusal
  }

  return {
    /** Adds a timer with a new id, or with the id given when the caller needs it to say more about the timer. */
    add: (kind: Timer['kind'], details: TimerDetails, id: string = crypto.randomUUID()) =>
      run({ type: 'add', timer: { id, kind, ...details } }, t('timerCommand.added', { name: details.name })),
    change: (timer: Timer, details: TimerDetails) =>
      run({ type: 'change', timerId: timer.id, details }, t('timerCommand.saved', { name: details.name })),
    start: (timer: Timer) => run({ type: 'start', timerId: timer.id }, t('timerCommand.started', { name: timer.name })),
    pause: (timer: Timer) => run({ type: 'pause', timerId: timer.id }, t('timerCommand.paused', { name: timer.name })),
    reset: (timer: Timer) => run({ type: 'reset', timerId: timer.id }, t('timerCommand.reset', { name: timer.name })),
    remove: (timer: Timer) => run({ type: 'remove', timerId: timer.id }, t('timerCommand.removed', { name: timer.name })),
    pin: (timer: Timer) => run({ type: 'pin', timerId: timer.id }, t('timerCommand.pinned', { name: timer.name })),
    unpin: (timer: Timer) => run({ type: 'unpin', timerId: timer.id }, t('timerCommand.unpinned', { name: timer.name })),
    markDone: (timer: Timer) => run({ type: 'markDone', timerId: timer.id }, t('timerCommand.markedDone', { name: timer.name })),
    undoDone: (timer: Timer) => run({ type: 'undoDone', timerId: timer.id }, t('timerCommand.undoneDone', { name: timer.name })),
    /** Skips a repeating task today. Given the focus session whose run uses the task, the snackbar says the task is taken out of it. */
    skipToday: (timer: Timer, inSession?: string) => run(
      { type: 'skipToday', timerId: timer.id },
      inSession === undefined ? t('timerCommand.skippedToday', { name: timer.name }) : t('timerCommand.skippedTodayInSession', { name: timer.name, session: inSession })
    )
  }
}
