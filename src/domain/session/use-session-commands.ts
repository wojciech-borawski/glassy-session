import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { whyRefused } from '../command/why-refused'
import type { Timer } from '../timer/model/timer'
import { useStoredTimers } from '../timer/stored-timers'
import type { SessionCommand } from './commands'
import type { FocusSession, FocusSessionSettings } from './model/focus-session'
import { useStoredSessions } from './stored-sessions'

/** Sends focus session commands through the stored focus sessions and says in the snackbar what each one did, or why it did nothing. */
export function useSessionCommands() {
  const { send } = useStoredSessions()
  const { timers } = useStoredTimers()
  const { show } = useSnackbar()
  const { t } = useI18n()

  async function run(command: SessionCommand, done: string): Promise<Refusal | null> {
    const refusal = await send(command)
    show(refusal === null ? done : whyRefused(refusal, t))
    return refusal
  }

  const runOn = (type: 'start' | 'pause' | 'resume' | 'skip' | 'endEarly' | 'pin' | 'unpin') => (session: FocusSession) =>
    run({ type, sessionId: session.id }, t(`sessionCommand.${type}`, { name: session.name }))

  function taskNameAt(session: FocusSession, step: number): string {
    const taskId = session.run?.plan[step]?.taskId
    return timers.value.find(({ id }) => id === taskId)?.name ?? ''
  }

  return {
    /** Adds a focus session with a new id, or with the id given when the caller needs it to say more about the session. */
    add: (settings: FocusSessionSettings, id: string = crypto.randomUUID()) =>
      run({ type: 'add', session: { id, ...settings } }, t('sessionCommand.added', { name: settings.name })),
    change: (session: FocusSession, settings: FocusSessionSettings) =>
      run({ type: 'change', sessionId: session.id, settings }, t('sessionCommand.saved', { name: settings.name })),
    remove: (session: FocusSession) => run({ type: 'remove', sessionId: session.id }, t('sessionCommand.removed', { name: session.name })),
    start: runOn('start'),
    pause: runOn('pause'),
    resume: runOn('resume'),
    skip: runOn('skip'),
    endEarly: runOn('endEarly'),
    pin: runOn('pin'),
    unpin: runOn('unpin'),
    moveStep: (session: FocusSession, from: number, to: number) =>
      run({ type: 'moveStep', sessionId: session.id, from, to }, t('sessionCommand.moved', { task: taskNameAt(session, from) })),
    sendToFront: (session: FocusSession, step: number) =>
      run({ type: 'sendToFront', sessionId: session.id, step }, t('sessionCommand.sentToFront', { task: taskNameAt(session, step) })),
    addTaskSteps: (session: FocusSession, task: Timer) =>
      run({ type: 'addTaskSteps', sessionId: session.id, taskId: task.id }, t('sessionCommand.taskAdded', { task: task.name, name: session.name })),
    markTaskDone: (session: FocusSession, task: Timer) =>
      run({ type: 'markTaskDone', sessionId: session.id, taskId: task.id }, t('sessionCommand.taskMarkedDone', { task: task.name }))
  }
}
