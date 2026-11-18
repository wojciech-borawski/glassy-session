import type { Moment } from '@/utils/time/units'
import type { CommandQueue } from './command-queue'
import { comeBack, comesBack, finishesAt, settle as settleTimer, usedOrDoneSince, useUp, type Timer } from '../timer/model/timer'
import type { Ringer } from '../timer/ports'
import type { Named, Ran, Refusal } from './command-outcome'
import { recordRepeatDays, recordUnusedRepeatDays, type ComingBack, type RepeatDayResults, type RepeatingTask } from '../tracking/model/repeat-day-results'
import type { DayOf } from '@/utils/time/calendar'
import { recordSpan, type TrackedTime } from '../tracking/model/tracked-time'
import type { RepeatDayResultStore, TrackedTimeStore } from '../tracking/ports'
import { nextEndingAt, settle as settleSession, tasksInRun, withOnlyTasks, withTaskDone, type Ending, type FocusSession } from '../session/model/focus-session'
import type { Chimer } from '../session/ports'
import type { OwnerEvent } from '../music/model/playback'
import type { TimersAndSessionsStore, ToolbarButton, Wake, WakeAt, WakeScheduler } from './ports'
import { soundOwnerEventsBetween } from './sound-owner-events'
import { toolbarBadgeAt } from './toolbar-badge'

type Stored = Readonly<{ timers: readonly Timer[], sessions: readonly FocusSession[] }>

/** What a change is given: the stored timers and focus sessions as of now, and the focus session whose run uses each task, by task id. */
type Given = Stored & Readonly<{ usedInRun: ReadonlyMap<string, Named> }>

/**
 * What a command leaves of the stored timers and focus sessions, and the spans of timers it ended. A field left out stays as it was.
 * `doneInRun` is a task the change made done while the run of a focus session uses it: the runner takes the task's steps out of up next
 * of that run and, when the current focus step is the task's, ends that step at once.
 * A change that refuses itself gives the refusal, and nothing it changed is saved. A ring, chime or comeback that settling found is still saved and given.
 */
type Changed = Readonly<{ timers?: readonly Timer[], sessions?: readonly FocusSession[], ran?: readonly Ran[], doneInRun?: string, refusal?: Refusal }>

/**
 * Runs each command in turn: loads the timers and focus sessions, brings back each repeating task whose repeat day has begun
 * since it used time or was done and that no focus session's run still uses, tracking the span it still ran without ringing, settles everything else that ran on until now,
 * applies the change, taking a task it made done out of the run of the focus session that uses it,
 * saves, sets each wake the saved state needs that the wake scheduler does not have at that moment, cancels each other timer or focus session wake the scheduler has,
 * so a wake that a background which stopped never set or cancelled is set or cancelled by the next command, hands on what it did to the timers and focus sessions that own
 * background sounds, shows the toolbar badge for what it saved without waiting for it, then rings and chimes for what ran out.
 * Each task that came back leaves the results of the repeat days it leaves, and each repeating task the results of the repeat days that passed
 * without it being used or done.
 * Timers and sessions are saved together in one write, before tracked time and repeat day results, so a worker that stops between two saves
 * loses tracked time or a result rather than counting it twice.
 */
export type RunCommand = (now: Moment, change: (stored: Given) => Changed, options?: RunOptions) => Promise<Refusal | null>

type RunOptions = Readonly<{
  /**
   * Sets every wake the saved state needs, also one the scheduler already has at its moment, so a background that just started sets up again
   * what a scheduler keeps beside the moment, as the browser's timeout for a wake less than 30 seconds away. Defaults to false.
   */
  everyWake?: boolean
}>

type Chime = Readonly<{ session: FocusSession, ending: Ending }>

type CommandRunnerDependencies = Readonly<{
  inTurn: CommandQueue
  store: TimersAndSessionsStore
  trackedTimeStore: TrackedTimeStore
  repeatDayResultStore: RepeatDayResultStore
  wakeScheduler: WakeScheduler
  ringer: Ringer
  chimer: Chimer
  dayOf: DayOf
  /** Hears what each command did to the timers and focus sessions that own background sounds, in the order the commands ran. Defaults to no one. */
  soundOwners?: (events: readonly OwnerEvent[]) => void
  /** Shows the toolbar badge for what each command left. Defaults to no button. */
  toolbarButton?: ToolbarButton
}>

function settleEverything({ timers, sessions }: Stored, now: Moment, dayOf: DayOf) {
  const ran: Ran[] = []
  const rings: Timer[] = []
  const chimes: Chime[] = []
  const cameBack: ComingBack[] = []
  const bringBack = (timer: Timer) => {
    if (comesBack(timer, now, dayOf)) {
      cameBack.push(comingBackOf(timer, now, dayOf))
    }
    const back = comeBack(timer, now, dayOf)
    if (back.ran !== null) {
      ran.push({ timerId: timer.id, span: back.ran })
    }
    return back.timer
  }
  const inRun = new Set(sessions.flatMap((session) => [...tasksInRun(session)]))
  let settledTimers = timers.map((timer) => {
    if (!inRun.has(timer.id) && comesBack(timer, now, dayOf)) {
      return bringBack(timer)
    }
    const settled = settleTimer(timer, now)
    if (settled.ran !== null) {
      ran.push({ timerId: timer.id, span: settled.ran })
      rings.push(settled.timer)
    }
    return settled.timer
  })
  const settledSessions = sessions.map((session) => {
    const transition = settleSession(session, now)
    for (const { taskId, span } of transition.focus) {
      settledTimers = settledTimers.map((timer) => {
        if (timer.id !== taskId) {
          return timer
        }
        const used = useUp(timer, span)
        if (used.ran !== null) {
          ran.push({ timerId: timer.id, span: used.ran })
        }
        return used.timer
      })
    }
    const latest = transition.endings.at(-1)
    if (latest !== undefined) {
      chimes.push({ session: transition.session, ending: latest.of })
    }
    return transition.session
  })
  const stillInRun = new Set(settledSessions.flatMap((session) => [...tasksInRun(session)]))
  settledTimers = settledTimers.map((timer) => inRun.has(timer.id) && !stillInRun.has(timer.id) ? bringBack(timer) : timer)
  return { stored: { timers: settledTimers, sessions: settledSessions }, ran, rings, chimes, cameBack }
}

export type Settled = ReturnType<typeof settleEverything>

/** What a repeating task that comes back at the moment leaves behind. */
function comingBackOf(timer: Timer, now: Moment, dayOf: DayOf): ComingBack {
  const since = usedOrDoneSince(timer) ?? now
  const { done } = settleTimer(timer, now).timer
  return {
    taskId: timer.id,
    repeatDays: timer.repeatDays ?? [],
    plannedTime: timer.plannedTime,
    since: dayOf(since).day,
    finishedOn: done === undefined ? null : dayOf(done.at).day,
    skipped: done?.skipped === true
  }
}

/**
 * The timers and focus sessions as the runner settles them at the moment before it runs a command, so a view shows what the background
 * would store: a repeating task that came back, and a task that a running session has used up to the moment.
 */
export function settledAsOf(stored: Stored, now: Moment, dayOf: DayOf): Settled {
  return settleEverything(stored, now, dayOf)
}

/** The stored timers and focus sessions of a settlement, with the focus session whose run uses each task, as a change is given it. */
export function storedOf({ stored }: Settled): Given {
  return { ...stored, usedInRun: usedInRunOf(stored.sessions) }
}

type Tracking = Readonly<{ trackedTime: TrackedTime, repeatDayResults: RepeatDayResults }>

function repeatingTaskOf(timer: Timer, dayOf: DayOf): RepeatingTask[] {
  if (timer.repeatDays === undefined || timer.repeatsSince === undefined) {
    return []
  }
  const usedSince = usedOrDoneSince(timer)
  return [{
    taskId: timer.id,
    repeatDays: timer.repeatDays,
    plannedTime: timer.plannedTime,
    repeatsSince: dayOf(timer.repeatsSince).day,
    usedSince: usedSince === undefined ? null : dayOf(usedSince).day
  }]
}

/** The tracking with the spans that tasks ran recorded as tracked time, and the results of the repeat days that the tasks that came back leave. */
function recordTracking(tracking: Tracking, timers: readonly Timer[], ran: readonly Ran[], cameBack: readonly ComingBack[], now: Moment, dayOf: DayOf): Tracking {
  const taskIds = new Set(timers.filter(({ kind }) => kind === 'task').map(({ id }) => id))
  const trackedTime = ran
    .filter(({ timerId }) => taskIds.has(timerId))
    .reduce((trackedSoFar, { timerId, span }) => recordSpan(trackedSoFar, timerId, span, dayOf), tracking.trackedTime)
  const today = dayOf(now).day
  const unused = timers.flatMap((timer) => repeatingTaskOf(timer, dayOf)).reduce((resultsSoFar, task) => recordUnusedRepeatDays(resultsSoFar, task, trackedTime, today), tracking.repeatDayResults)
  const repeatDayResults = cameBack.reduce((resultsSoFar, task) => recordRepeatDays(resultsSoFar, task, trackedTime, today), unused)
  return { trackedTime, repeatDayResults }
}

/**
 * The tracked time and repeat day results as the runner records them for a settlement, before it runs a command, so a view shows what
 * the background would store: the spans of tasks that ran out or came back, and the results of the repeat days that the tasks that came back leave.
 */
export function trackingOf(tracking: Tracking, timers: readonly Timer[], settled: Settled, now: Moment, dayOf: DayOf): Tracking {
  return recordTracking(tracking, timers, settled.ran, settled.cameBack, now, dayOf)
}

/** Where a task is used: on its own, as null, or in the run of a focus session. */
type Place = FocusSession | null

function placesOf({ timers, sessions }: Stored): Map<string, Place[]> {
  const places = new Map<string, Place[]>()
  const useIn = (taskId: string, place: Place) => places.set(taskId, [...places.get(taskId) ?? [], place])
  timers.filter(({ runningSince }) => runningSince !== null).forEach(({ id }) => useIn(id, null))
  sessions.forEach((session) => tasksInRun(session).forEach((taskId) => useIn(taskId, session)))
  return places
}

const isSamePlace = (one: Place, other: Place) => one === null ? other === null : one.id === other?.id

const named = ({ id, name }: Named): Named => ({ id, name })

function usedInRunOf(sessions: readonly FocusSession[]): Map<string, Named> {
  return new Map(sessions.flatMap((session) => [...tasksInRun(session)].map((taskId) => [taskId, named(session)] as const)))
}

/** Refuses the change when it leaves a task in two places, naming the place the task was in before the change. */
function taskInTwoPlaces(before: Stored, after: Stored): Refusal | null {
  const placesBefore = placesOf(before)
  for (const [taskId, places] of placesOf(after)) {
    if (places.length < 2) {
      continue
    }
    const usedIn = places.find((place) => placesBefore.get(taskId)?.some((earlier) => isSamePlace(place, earlier))) ?? places[0] ?? null
    const task = after.timers.find(({ id }) => id === taskId) ?? { id: taskId, name: taskId }
    return { reason: 'task in use', task: named(task), usedIn: usedIn === null ? null : named(usedIn) }
  }
  return null
}

/** Refuses the change when it removes a task that the run of a focus session still uses, naming that session. */
function taskTakenFromRun(before: Stored, keptTaskIds: ReadonlySet<string>, sessions: readonly FocusSession[]): Refusal | null {
  for (const session of sessions) {
    const task = before.timers.find(({ id }) => tasksInRun(session).has(id) && !keptTaskIds.has(id))
    if (task !== undefined) {
      return { reason: 'task in use', task: named(task), usedIn: named(session) }
    }
  }
  return null
}

const keyOf = ({ of, id }: Wake) => `${of}:${id}`

function wakesOf({ timers, sessions }: Stored): Map<string, WakeAt> {
  const wakes = new Map<string, WakeAt>()
  const add = (wake: Wake, moment: Moment | null) => {
    if (moment !== null) {
      wakes.set(keyOf(wake), { wake, moment })
    }
  }
  timers.forEach((timer) => add({ of: 'timer', id: timer.id }, finishesAt(timer)))
  sessions.forEach((session) => add({ of: 'focus session', id: session.id }, nextEndingAt(session)))
  return wakes
}

const noButton: ToolbarButton = { showBadge: async () => {} }

export function createCommandRunner(dependencies: CommandRunnerDependencies): RunCommand {
  const { inTurn, store, trackedTimeStore, repeatDayResultStore, wakeScheduler, ringer, chimer, dayOf, soundOwners = () => {}, toolbarButton = noButton } = dependencies
  return (now, change, { everyWake = false } = {}) => inTurn(async () => {
    const loaded = await store.load()
    const settled = settleEverything(loaded, now, dayOf)
    const changed = change({ ...settled.stored, usedInRun: usedInRunOf(settled.stored.sessions) })
    const outcome = changed.refusal === undefined ? checked(settled.stored, withDoneTaskOutOfRun(settled.stored, changed, now)) : { refusal: changed.refusal }
    if ('refusal' in outcome) {
      if (settledSomethingDue(settled)) {
        await keep(loaded, settled, settled.stored, [], now, everyWake)
      }
      return outcome.refusal
    }
    await keep(loaded, settled, outcome.after, changed.ran ?? [], now, everyWake)
    return null
  })

  /** Saves what the command left, records the tracking, sets and cancels wakes, tells the sound owners, shows the toolbar badge, then rings and chimes for what ran out. */
  async function keep(loaded: Stored, settled: Settled, after: Stored, changeRan: readonly Ran[], now: Moment, everyWake: boolean) {
    const stored = { trackedTime: await trackedTimeStore.load(), repeatDayResults: await repeatDayResultStore.load() }
    const tracking = recordTracking(stored, loaded.timers, [...settled.ran, ...changeRan], settled.cameBack, now, dayOf)
    await store.save(after)
    await trackedTimeStore.save(tracking.trackedTime)
    if (tracking.repeatDayResults !== stored.repeatDayResults) {
      await repeatDayResultStore.save(tracking.repeatDayResults)
    }
    const wakes = wakesOf(after)
    const scheduled = new Map((await wakeScheduler.scheduled()).filter(({ wake }) => wake.of !== 'alarm').map((wakeAt) => [keyOf(wakeAt.wake), wakeAt]))
    for (const [key, { wake, moment }] of wakes) {
      if (everyWake || scheduled.get(key)?.moment !== moment) {
        await wakeScheduler.wakeAt(wake, moment)
      }
    }
    for (const [key, { wake }] of scheduled) {
      if (!wakes.has(key)) {
        await wakeScheduler.cancel(wake)
      }
    }
    const ownerEvents = soundOwnerEventsBetween(loaded, after)
    if (ownerEvents.length > 0) {
      soundOwners(ownerEvents)
    }
    void toolbarButton.showBadge(toolbarBadgeAt(after, now))
    for (const timer of settled.rings) {
      await ringer.ring(timer)
    }
    for (const { session, ending } of settled.chimes) {
      await chimer.chime(session, ending)
    }
  }
}

/** The change with the task it made done taken out of the run of the focus session that uses it. */
function withDoneTaskOutOfRun(before: Stored, changed: Changed, now: Moment): Changed {
  const { doneInRun } = changed
  if (doneInRun === undefined) {
    return changed
  }
  const sessions = (changed.sessions ?? before.sessions).map((session) => tasksInRun(session).has(doneInRun) ? withTaskDone(session, doneInRun, now) : session)
  return { ...changed, sessions }
}

/** The timers and focus sessions the change leaves, each session keeping only stored tasks, or why the change is refused. */
function checked(before: Stored, changed: Changed): Readonly<{ after: Stored }> | Readonly<{ refusal: Refusal }> {
  const timers = changed.timers ?? before.timers
  const sessions = changed.sessions ?? before.sessions
  const taskIds = new Set(timers.filter(({ kind }) => kind === 'task').map(({ id }) => id))
  const after = { timers, sessions: sessions.map((session) => withOnlyTasks(session, taskIds)) }
  const refusal = taskTakenFromRun(before, taskIds, sessions) ?? taskInTwoPlaces(before, after)
  return refusal === null ? { after } : { refusal }
}

/**
 * Whether settling found a ring, a chime or a task that came back, which a refused command still keeps and gives.
 * The focus a running session used so far is left for the next command, which records it the same.
 */
function settledSomethingDue({ rings, chimes, cameBack }: Settled) {
  return rings.length > 0 || chimes.length > 0 || cameBack.length > 0
}
