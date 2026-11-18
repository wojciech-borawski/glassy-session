import type { Duration, Moment, Span } from '@/utils/time/units'
import { remainingTimeAt, type Timer } from '../../timer/model/timer'
import { buildPlan, fitPlan, withStepMoved, withTaskAdded, type FocusStep, type Order, type Plan, type TaskTime } from './plan'

type Run = Readonly<{
  /** The saved plan fitted to the tasks when the run started, then changed while it runs. */
  plan: Plan
  /** How far the run is into its focus steps and breaks, as of `since`. Always less than the whole run. */
  position: Duration
  /** How long the run has been paused, as of `since`. */
  delay: Duration
  since: Moment
  paused: boolean
}>

export type NewFocusSession = Readonly<{
  id: string
  name: string
  taskIds: readonly string[]
  stepLength: Duration
  breakLength: Duration
  order: Order
  /** Whether the session shows in the overlay on every page. A session without it is not pinned. */
  pinned?: boolean
}>

export type FocusSessionSettings = Omit<NewFocusSession, 'id'>

export type FocusSession = NewFocusSession & Readonly<{
  plan: Plan
  /** The run in progress, or null when the session is idle. */
  run: Run | null
}>

type State = Readonly<{ state: 'idle' | 'focus step' | 'break' | 'finished' } | { state: 'paused', pausedIn: 'focus step' | 'break' }>

export type Progress = State & Readonly<{
  /** The latest focus step that has started: the one in progress, or the one whose break is running. Steps after it are up next. */
  currentStep: number | null
  /** What is left of the current focus step or break. */
  remainingTime: Duration | null
  /** The whole length of the current focus step or break. */
  partLength: Duration | null
  /** For a finished session, the moment it ended. */
  estimatedEnd: Moment | null
  delay: Duration
  progressLine: Readonly<{
    parts: readonly Readonly<{ kind: 'focus step', taskId: string, length: Duration } | { kind: 'break', length: Duration }>[]
    filled: Duration
  }>
}>

/**
 * What a change to a running session leaves of it and what happened up to the change, in order.
 * Every transition first settles the session, so it reports what passed while nobody looked, and reports each thing once.
 * The end of the last focus step is reported as the end of the session.
 */
export type Transition = Readonly<{
  session: FocusSession
  focus: readonly Readonly<{ taskId: string, span: Span }>[]
  endings: readonly Readonly<{ of: Ending, at: Moment }>[]
}>

export type Ending = 'focus step' | 'break' | 'session'

type Part = Readonly<{ step: number, from: Duration, to: Duration } & ({ kind: 'focus step', taskId: string } | { kind: 'break' })>

type Timeline = Readonly<{ parts: readonly Part[], length: Duration }>

function timelineOf(plan: Plan, breakLength: Duration): Timeline {
  const parts: Part[] = []
  let length = 0
  plan.forEach(({ taskId, length: stepLength }, step) => {
    if (step > 0 && breakLength > 0) {
      parts.push({ kind: 'break', step: step - 1, from: length, to: length + breakLength })
      length += breakLength
    }
    parts.push({ kind: 'focus step', taskId, step, from: length, to: length + stepLength })
    length += stepLength
  })
  return { parts, length }
}

function partAt({ parts }: Timeline, position: Duration): Part | undefined {
  return parts.find(({ to }) => position < to)
}

function positionAt(run: Run, now: Moment): Duration {
  return run.paused ? run.position : run.position + Math.max(0, now - run.since)
}

function delayAt(run: Run, now: Moment): Duration {
  return run.paused ? run.delay + Math.max(0, now - run.since) : run.delay
}

/**
 * What each stored task has left at the moment, to fit a plan to. Timers that are not tasks have no place in a plan.
 * Given task ids, it is what each of those tasks has left, in their order, or null when one of them is not a stored task.
 */
export function taskTimesAt(timers: readonly Timer[], now: Moment): TaskTime[]
export function taskTimesAt(timers: readonly Timer[], now: Moment, taskIds: readonly string[]): TaskTime[] | null
export function taskTimesAt(timers: readonly Timer[], now: Moment, taskIds?: readonly string[]): TaskTime[] | null {
  const tasks = timers.filter(({ kind }) => kind === 'task')
  const named = taskIds === undefined ? tasks : taskIds.flatMap((taskId) => tasks.filter(({ id }) => id === taskId).slice(0, 1))
  if (taskIds !== undefined && named.length !== taskIds.length) {
    return null
  }
  return named.map((task) => ({ taskId: task.id, remainingTime: remainingTimeAt(task, now) }))
}

export function createFocusSession(newSession: NewFocusSession, tasks: readonly TaskTime[]): FocusSession {
  const { name, taskIds, stepLength, breakLength, order } = newSession
  if (name.trim() === '') {
    throw new RangeError('A focus session needs a name')
  }
  if (!Number.isFinite(stepLength) || stepLength <= 0) {
    throw new RangeError(`A focus session needs a positive step length, got ${stepLength}`)
  }
  if (!Number.isFinite(breakLength) || breakLength < 0) {
    throw new RangeError(`A focus session needs a break length of zero or more, got ${breakLength}`)
  }
  const left = new Map(tasks.map(({ taskId, remainingTime }) => [taskId, remainingTime]))
  const taskTimes = taskIds.map((taskId) => ({ taskId, remainingTime: left.get(taskId) ?? 0 }))
  return { ...newSession, plan: buildPlan(taskTimes, stepLength, order), run: null }
}

export function withSettings(session: FocusSession, settings: FocusSessionSettings, tasks: readonly TaskTime[]): FocusSession {
  if (session.run !== null) {
    return session
  }
  const changed = createFocusSession({ ...settings, id: session.id, pinned: settings.pinned ?? session.pinned }, tasks)
  const cutTheSame = settings.stepLength === session.stepLength && settings.order === session.order
    && settings.taskIds.length === session.taskIds.length && settings.taskIds.every((taskId, index) => taskId === session.taskIds[index])
  return cutTheSame ? { ...changed, plan: session.plan } : changed
}

type ProgressLine = Progress['progressLine']

function progressLineOf({ parts }: Timeline, filled: Duration): ProgressLine {
  return {
    parts: parts.map((part) => part.kind === 'break'
      ? { kind: part.kind, length: part.to - part.from }
      : { kind: part.kind, taskId: part.taskId, length: part.to - part.from }),
    filled
  }
}

/** What starting the session would run: the saved plan fitted to what each task has left. */
export type FittedPlan = Readonly<{
  focusSteps: number
  /** How long it takes with its breaks. */
  length: Duration
  progressLine: ProgressLine
}>

export function fittedPlanOf(session: FocusSession, tasks: readonly TaskTime[]): FittedPlan {
  const plan = fitPlan(session.plan, tasks)
  const timeline = timelineOf(plan, session.breakLength)
  return { focusSteps: plan.length, length: timeline.length, progressLine: progressLineOf(timeline, 0) }
}

export function progressAt(session: FocusSession, now: Moment): Progress {
  const { run } = session
  const timeline = timelineOf(run?.plan ?? session.plan, session.breakLength)
  const progressLine = (filled: Duration) => progressLineOf(timeline, filled)
  if (run === null) {
    return { state: 'idle', currentStep: null, remainingTime: null, partLength: null, estimatedEnd: null, delay: 0, progressLine: progressLine(0) }
  }
  const { length } = timeline
  const position = Math.min(length, positionAt(run, now))
  const estimatedEnd = Math.max(now, run.since) + length - positionAt(run, now)
  const delay = delayAt(run, now)
  const part = partAt(timeline, position)
  if (part === undefined) {
    return { state: 'finished', currentStep: null, remainingTime: null, partLength: null, estimatedEnd, delay, progressLine: progressLine(length) }
  }
  const state: State = run.paused ? { state: 'paused', pausedIn: part.kind } : { state: part.kind }
  return { ...state, currentStep: part.step, remainingTime: part.to - position, partLength: part.to - part.from, estimatedEnd, delay, progressLine: progressLine(position) }
}

/** Whether the session is in a focus step or a break that is counting down. */
export function isCountingDownAt(session: FocusSession, now: Moment): boolean {
  const { state } = progressAt(session, now)
  return state === 'focus step' || state === 'break'
}

export function withOnlyTasks(session: FocusSession, taskIds: ReadonlySet<string>): FocusSession {
  return {
    ...session,
    taskIds: session.taskIds.filter((taskId) => taskIds.has(taskId)),
    plan: session.plan.filter(({ taskId }) => taskIds.has(taskId))
  }
}

export function tasksInRun(session: FocusSession): ReadonlySet<string> {
  return new Set(session.run?.plan.map(({ taskId }) => taskId))
}

export function nextEndingAt(session: FocusSession): Moment | null {
  const { run } = session
  if (run === null || run.paused) {
    return null
  }
  const part = partAt(timelineOf(run.plan, session.breakLength), run.position)
  return part === undefined ? null : run.since + part.to - run.position
}

function unchanged(session: FocusSession): Transition {
  return { session, focus: [], endings: [] }
}

export function settle(session: FocusSession, now: Moment): Transition {
  const { run } = session
  if (run === null || run.paused) {
    return unchanged(session)
  }
  const moment = Math.max(now, run.since)
  const { parts, length } = timelineOf(run.plan, session.breakLength)
  const position = Math.min(length, positionAt(run, moment))
  const momentAt = (at: Duration) => run.since + at - run.position
  const focus = parts
    .flatMap((part) => part.kind === 'focus step' ? [part] : [])
    .filter(({ from, to }) => Math.max(from, run.position) < Math.min(to, position))
    .map(({ taskId, from, to }) => ({ taskId, span: { from: momentAt(Math.max(from, run.position)), to: momentAt(Math.min(to, position)) } }))
  const endings = parts
    .filter(({ to }) => to > run.position && to <= position)
    .map(({ kind, to }) => ({ of: to === length ? 'session' as const : kind, at: momentAt(to) }))
  const settled = position === length ? null : { ...run, position, since: moment }
  return { session: { ...session, run: settled }, focus, endings }
}

export function start(session: FocusSession, tasks: readonly TaskTime[], now: Moment): Transition {
  const settled = settle(session, now)
  if (settled.session.run !== null) {
    return settled
  }
  const plan = fitPlan(session.plan, tasks)
  if (plan.length === 0) {
    return settled
  }
  return { ...settled, session: { ...settled.session, run: { plan, position: 0, delay: 0, since: now, paused: false } } }
}

export function pause(session: FocusSession, now: Moment): Transition {
  const settled = settle(session, now)
  const { run } = settled.session
  if (run === null) {
    return settled
  }
  return { ...settled, session: { ...settled.session, run: { ...run, paused: true } } }
}

export function resume(session: FocusSession, now: Moment): Transition {
  const settled = settle(session, now)
  const { run } = settled.session
  if (run === null) {
    return settled
  }
  const resumed = { ...run, delay: delayAt(run, now), since: Math.max(now, run.since), paused: false }
  return { ...settled, session: { ...settled.session, run: resumed } }
}

export function skip(session: FocusSession, now: Moment): Transition {
  const settled = settle(session, now)
  const { run } = settled.session
  if (run === null || run.paused) {
    return settled
  }
  const part = partAt(timelineOf(run.plan, session.breakLength), run.position)
  if (part?.kind !== 'break') {
    return settled
  }
  return {
    ...settled,
    session: { ...settled.session, run: { ...run, position: part.to } },
    endings: [...settled.endings, { of: 'break', at: run.since }]
  }
}

export function endEarly(session: FocusSession, now: Moment): Transition {
  const settled = settle(session, now)
  const { run } = settled.session
  if (run === null) {
    return settled
  }
  return {
    ...settled,
    session: { ...settled.session, run: null },
    endings: [...settled.endings, { of: 'session', at: Math.max(now, run.since) }]
  }
}

export function isPinned(session: FocusSession): boolean {
  return session.pinned === true
}

export function pin(session: FocusSession): FocusSession {
  return { ...session, pinned: true }
}

export function unpin(session: FocusSession): FocusSession {
  return { ...session, pinned: false }
}

/** A focus step of up next, with its place in the plan of the run. */
export type UpNextStep = FocusStep & Readonly<{ step: number }>

export function upNextAt(session: FocusSession, now: Moment): readonly UpNextStep[] {
  const { run } = session
  if (run === null) {
    return []
  }
  const current = partAt(timelineOf(run.plan, session.breakLength), positionAt(run, now))
  if (current === undefined) {
    return []
  }
  return run.plan.flatMap((focusStep, step) => step > current.step ? [{ ...focusStep, step }] : [])
}

/** Changes up next of the run, the steps after the current step. An idle session has no up next and stays as it was. */
function changingUpNext(session: FocusSession, now: Moment, change: (plan: Plan, firstMovable: number) => Plan): FocusSession {
  const { run } = session
  if (run === null) {
    return session
  }
  const current = partAt(timelineOf(run.plan, session.breakLength), positionAt(run, now))
  if (current === undefined) {
    return session
  }
  return { ...session, run: { ...run, plan: change(run.plan, current.step + 1) } }
}

export function moveStep(session: FocusSession, from: number, to: number, now: Moment): FocusSession {
  return changingUpNext(session, now, (plan, firstMovable) => withStepMoved(plan, firstMovable, from, to))
}

export function sendToFront(session: FocusSession, step: number, now: Moment): FocusSession {
  return changingUpNext(session, now, (plan, firstMovable) => withStepMoved(plan, firstMovable, step, firstMovable))
}

/**
 * What marking the task done does to the run: every step of the task leaves up next, for this run only, and a current focus step
 * of the task ends at once, so the break after it or the next focus step starts, or the run ends after its last focus step.
 * An idle session keeps its saved plan.
 */
export function withTaskDone(session: FocusSession, taskId: string, now: Moment): FocusSession {
  const without = changingUpNext(session, now, (plan, firstMovable) => plan.filter((focusStep, step) => step < firstMovable || focusStep.taskId !== taskId))
  const { run } = without
  if (run === null) {
    return without
  }
  const timeline = timelineOf(run.plan, session.breakLength)
  const current = partAt(timeline, positionAt(run, now))
  if (current?.kind !== 'focus step' || current.taskId !== taskId) {
    return without
  }
  if (current.to === timeline.length) {
    return { ...without, run: null }
  }
  return { ...without, run: run.paused ? { ...run, position: current.to } : { ...run, position: current.to, since: Math.max(now, run.since) } }
}

export function addTaskSteps(session: FocusSession, task: TaskTime, now: Moment): FocusSession {
  return changingUpNext(session, now, (plan) => withTaskAdded(plan, task, session.stepLength))
}
