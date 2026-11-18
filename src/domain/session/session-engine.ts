import type { Moment } from '@/utils/time/units'
import { markDone, type Timer } from '../timer/model/timer'
import type { Refusal } from '../command/command-outcome'
import type { RunCommand } from '../command/command-runner'
import type { SessionCommand } from './commands'
import { addTaskSteps, createFocusSession, endEarly, moveStep, pause, pin, resume, sendToFront, skip, start, taskTimesAt, tasksInRun, unpin, upNextAt, withTaskDone, withSettings, type FocusSession, type FocusSessionSettings, type NewFocusSession, type Transition } from './model/focus-session'

/** Refuses a change to up next of a session with no run, or by a step that is no longer up next, naming the first such step and its task. */
function notUpNext(session: FocusSession, steps: readonly number[], timers: readonly Timer[], now: Moment): Refusal | null {
  if (session.run === null) {
    return { reason: 'run ended' }
  }
  const upNext = new Set(upNextAt(session, now).map(({ step }) => step))
  const step = steps.find((referred) => !upNext.has(referred))
  if (step === undefined) {
    return null
  }
  const taskId = session.run.plan[step]?.taskId ?? ''
  return { reason: 'not up next', task: { id: taskId, name: timers.find(({ id }) => id === taskId)?.name ?? '' }, step }
}

export type SessionEngine = ReturnType<typeof createSessionEngine>

/**
 * The use cases the background runs on stored focus sessions, through the runner it is given, so nothing is kept between calls.
 * A command for a session id that is not stored, or that names a task that is not stored, is refused as already removed. Removing
 * a session that is not stored changes nothing, and so does adding a session whose id is already stored.
 * Starting a session whose tasks have no time left is refused, naming its first task.
 * A command to up next of a session that has no run is refused, saying the run has ended.
 */
export function createSessionEngine(run: RunCommand) {
  /** Changes the stored session with the id, or gives the change's refusal. A session that is not stored is refused as already removed. */
  function changeOne(sessionId: string, now: Moment, change: (session: FocusSession, timers: readonly Timer[]) => FocusSession | Refusal) {
    return run(now, ({ timers, sessions }) => {
      const session = sessions.find(({ id }) => id === sessionId)
      if (session === undefined) {
        return { refusal: { reason: 'already removed' } }
      }
      const changed = change(session, timers)
      return 'reason' in changed ? { refusal: changed } : { sessions: sessions.map((stored) => stored.id === sessionId ? changed : stored) }
    })
  }

  /** Changes up next of the session's run, unless it has no run or a step it names is no longer up next. */
  function changeUpNext(sessionId: string, now: Moment, steps: readonly number[], change: (session: FocusSession) => FocusSession) {
    return run(now, ({ timers, sessions }) => {
      const session = sessions.find(({ id }) => id === sessionId)
      const refusal = session === undefined ? { reason: 'already removed' } as const : notUpNext(session, steps, timers, now)
      return refusal !== null ? { refusal } : { sessions: sessions.map((stored) => stored.id === sessionId ? change(stored) : stored) }
    })
  }

  function transition(model: (session: FocusSession, now: Moment) => Transition) {
    return (sessionId: string, now: Moment) => changeOne(sessionId, now, (session) => model(session, now).session)
  }

  const engine = {
    add: (newSession: NewFocusSession, now: Moment) => run(now, ({ timers, sessions }) => {
      const tasks = taskTimesAt(timers, now, newSession.taskIds)
      if (tasks === null) {
        return { refusal: { reason: 'already removed' } }
      }
      if (sessions.some((session) => session.id === newSession.id)) {
        return {}
      }
      return { sessions: [...sessions, createFocusSession(newSession, tasks)] }
    }),
    change: (sessionId: string, settings: FocusSessionSettings, now: Moment) => changeOne(sessionId, now, (session, timers) => {
      const tasks = taskTimesAt(timers, now, settings.taskIds)
      return tasks === null ? { reason: 'already removed' } : withSettings(session, settings, tasks)
    }),
    remove: (sessionId: string, now: Moment) => run(now, ({ sessions }) => ({
      sessions: sessions.filter((session) => session.id !== sessionId)
    })),
    /** Starts the session, unless its tasks have no time left, which is refused naming its first task, or the session when it has none. */
    start: (sessionId: string, now: Moment) => changeOne(sessionId, now, (session, timers): FocusSession | Refusal => {
      const started = start(session, taskTimesAt(timers, now, session.taskIds) ?? [], now).session
      if (started.run !== null) {
        return started
      }
      const firstTask = timers.find(({ id }) => id === session.taskIds[0]) ?? session
      return { reason: 'no time left', task: { id: firstTask.id, name: firstTask.name } }
    }),
    pause: transition(pause),
    resume: transition(resume),
    skip: transition(skip),
    endEarly: transition(endEarly),
    pin: (sessionId: string, now: Moment) => changeOne(sessionId, now, pin),
    unpin: (sessionId: string, now: Moment) => changeOne(sessionId, now, unpin),
    moveStep: (sessionId: string, from: number, to: number, now: Moment) => changeUpNext(sessionId, now, [from, to], (session) => moveStep(session, from, to, now)),
    sendToFront: (sessionId: string, step: number, now: Moment) => changeUpNext(sessionId, now, [step], (session) => sendToFront(session, step, now)),
    addTaskSteps: (sessionId: string, taskId: string, now: Moment) => run(now, ({ timers, sessions }) => {
      const session = sessions.find(({ id }) => id === sessionId)
      const stored = timers.find(({ id }) => id === taskId)
      const [task] = taskTimesAt(timers, now, [taskId]) ?? []
      if (session === undefined || stored === undefined || task === undefined) {
        return { refusal: { reason: 'already removed' } }
      }
      if (session.run === null) {
        return { refusal: { reason: 'run ended' } }
      }
      if (tasksInRun(session).has(taskId)) {
        return { refusal: { reason: 'task in use', task: { id: stored.id, name: stored.name }, usedIn: { id: session.id, name: session.name } } }
      }
      if (task.remainingTime === 0) {
        return { refusal: { reason: 'no time left', task: { id: stored.id, name: stored.name } } }
      }
      return { sessions: sessions.map((one) => one.id === sessionId ? addTaskSteps(one, task, now) : one) }
    }),
    /** Marks the task done, takes its steps out of up next of this session's run and ends its current focus step. A task that another session's run uses is refused. */
    markTaskDone: (sessionId: string, taskId: string, now: Moment) => run(now, ({ timers, sessions, usedInRun }) => {
      const session = sessions.find(({ id }) => id === sessionId)
      if (session === undefined) {
        return { refusal: { reason: 'already removed' } }
      }
      if (session.run === null) {
        return { refusal: { reason: 'run ended' } }
      }
      const task = timers.find(({ id, kind }) => id === taskId && kind === 'task')
      if (task === undefined) {
        return { refusal: { reason: 'already removed' } }
      }
      const usedIn = usedInRun.get(taskId)
      if (usedIn !== undefined && usedIn.id !== sessionId) {
        return { refusal: { reason: 'task in use', task: { id: task.id, name: task.name }, usedIn } }
      }
      const done = markDone(task, now)
      return {
        timers: timers.map((timer) => timer.id === taskId ? done.timer : timer),
        sessions: sessions.map((session) => session.id === sessionId ? withTaskDone(session, taskId, now) : session),
        ran: done.ran === null ? [] : [{ timerId: taskId, span: done.ran }]
      }
    }),
    settleAll: (now: Moment) => run(now, () => ({})),
    /** Settles everything up to now and sets every wake again, for a browser that starts or an extension that was updated. */
    settleAllAtStart: (now: Moment) => run(now, () => ({}), { everyWake: true })
  }

  /** Runs the focus session command with the use case it names. */
  function runCommand(command: SessionCommand, now: Moment) {
    switch (command.type) {
    case 'add':
      return engine.add(command.session, now)
    case 'change':
      return engine.change(command.sessionId, command.settings, now)
    case 'moveStep':
      return engine.moveStep(command.sessionId, command.from, command.to, now)
    case 'sendToFront':
      return engine.sendToFront(command.sessionId, command.step, now)
    case 'addTaskSteps':
      return engine.addTaskSteps(command.sessionId, command.taskId, now)
    case 'markTaskDone':
      return engine.markTaskDone(command.sessionId, command.taskId, now)
    default:
      return engine[command.type](command.sessionId, now)
    }
  }

  return { ...engine, run: runCommand }
}
