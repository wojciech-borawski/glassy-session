import { createMemoryChimer } from '@/infrastructure/memory/chimer'
import { createMemoryRepeatDayResultStore } from '@/infrastructure/memory/repeat-day-result-store'
import { createMemoryRinger } from '@/infrastructure/memory/ringer'
import { createMemorySessionStore } from '@/infrastructure/memory/session-store'
import { createMemoryTimerStore } from '@/infrastructure/memory/timer-store'
import { createMemoryTimersAndSessionsStore } from '@/infrastructure/memory/timers-and-sessions-store'
import { createMemoryTrackedTimeStore } from '@/infrastructure/memory/tracked-time-store'
import { createMemoryWakeScheduler } from '@/infrastructure/memory/wake-scheduler'
import { createTimer, remainingTimeAt, runStateAt } from '../timer/model/timer'
import { createCommandQueue } from '../command/command-queue'
import { createTimerEngine } from '../timer/timer-engine'
import type { DayOf } from '@/utils/time/calendar'
import { trackedOn } from '../tracking/model/tracked-time'
import { createCommandRunner } from '../command/command-runner'
import type { TimersAndSessionsStore } from '../command/ports'
import { isPinned, progressAt, tasksInRun } from './model/focus-session'
import { createSessionEngine, type SessionEngine } from './session-engine'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const NINE = Date.UTC(2026, 10, 17, 9)

/** Days in UTC, so the tests do not depend on the machine's time zone. */
const dayOf: DayOf = (moment) => {
  const startsAt = moment - moment % DAY
  return { day: new Date(startsAt).toISOString().slice(0, 10), endsAt: startsAt + DAY }
}

const writeReport = { id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } } as const
const answerEmail = { id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'blue' } } as const
const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const

/** Write report for two focus steps, then answer email: focus 0-25, break, 30-55, break, 60-85, break, 90-95 minutes after the start. */
const morning = {
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
} as const

async function setup() {
  const timerStore = createMemoryTimerStore()
  const sessionStore = createMemorySessionStore()
  const trackedTimeStore = createMemoryTrackedTimeStore()
  const wakeScheduler = createMemoryWakeScheduler()
  const chimer = createMemoryChimer()
  const ringer = createMemoryRinger()
  const store = createMemoryTimersAndSessionsStore(timerStore, sessionStore)
  const saves: Parameters<TimersAndSessionsStore['save']>[0][] = []
  const recordingStore: TimersAndSessionsStore = { load: store.load, save: (saved) => { saves.push(saved); return store.save(saved) } }
  const run = createCommandRunner({ inTurn: createCommandQueue(), store: recordingStore, trackedTimeStore, repeatDayResultStore: createMemoryRepeatDayResultStore(), wakeScheduler, ringer, chimer, dayOf })
  const sessions = createSessionEngine(run)
  const timers = createTimerEngine(run, dayOf)
  await timerStore.save([createTimer(writeReport), createTimer(answerEmail), createTimer(tea)])
  async function storedTimer(id: string) {
    const timer = (await timerStore.load()).find((stored) => stored.id === id)
    if (timer === undefined) {
      throw new Error(`No stored timer ${id}`)
    }
    return timer
  }
  async function storedSession(id: string) {
    const session = (await sessionStore.load()).find((stored) => stored.id === id)
    if (session === undefined) {
      throw new Error(`No stored focus session ${id}`)
    }
    return session
  }
  return { sessions, timers, storedSession, storedTimer, storedSessions: () => sessionStore.load(),
    trackedOnDay: async (taskId: string, day: string) => trackedOn(await trackedTimeStore.load(), taskId, day),
    wakes: wakeScheduler.wakes, chimed: chimer.chimed, rang: ringer.rang, saves }
}

type Engines = Pick<Awaited<ReturnType<typeof setup>>, 'sessions' | 'timers'>

describe('the session engine', () => {
  test('an added session is stored idle, with a saved plan cut from its tasks\' remaining time', async () => {
    const { sessions, storedSession } = await setup()

    await sessions.add(morning, NINE)

    const session = await storedSession('morning')
    expect(progressAt(session, NINE).state).toBe('idle')
    expect(session.plan).toEqual([
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test('adding a session whose id is already stored changes nothing', async () => {
    const { sessions, storedSessions } = await setup()
    await sessions.add(morning, NINE)
    const before = await storedSessions()

    await sessions.add({ ...morning, name: 'Another morning', taskIds: ['answer-email'] }, NINE)

    expect(await storedSessions()).toEqual(before)
  })

  test.each([
    ['a task that is not stored', 'no-such-task'],
    ['a timer that is not a task', 'tea']
  ])('adding a session with %s is refused as already removed and changes nothing', async (_, taskId) => {
    const { sessions, storedSessions } = await setup()

    const refusal = await sessions.add({ ...morning, taskIds: ['write-report', taskId] }, NINE)

    expect(refusal).toEqual({ reason: 'already removed' })
    expect(await storedSessions()).toEqual([])
  })

  test('a started session is running in its first focus step from the moment it started', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)

    await sessions.start('morning', NINE)

    expect(progressAt(await storedSession('morning'), NINE + 10 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 0, remainingTime: 15 * MINUTE })
  })

  test('starting a session sets its wake to the moment its first focus step ends', async () => {
    const { sessions, wakes } = await setup()
    await sessions.add(morning, NINE)

    await sessions.start('morning', NINE)

    expect(wakes.get('focus session:morning')).toBe(NINE + 25 * MINUTE)
  })

  test('settling after the first focus step ended uses up that step from its task', async () => {
    const { sessions, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 27 * MINUTE)

    expect(remainingTimeAt(await storedTimer('write-report'), NINE + 27 * MINUTE)).toBe(25 * MINUTE)
  })

  test('the focus a session reports is tracked time of its task on that day', async () => {
    const { sessions, trackedOnDay } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 40 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(35 * MINUTE)
  })

  test('a focus step that ends gives the end chime', async () => {
    const { sessions, chimed } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 27 * MINUTE)

    expect(chimed).toEqual([{ sessionId: 'morning', ending: 'focus step' }])
  })

  test('a break that ends gives the start chime, also when the focus step before it ended unnoticed', async () => {
    const { sessions, chimed } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 31 * MINUTE)

    expect(chimed).toEqual([{ sessionId: 'morning', ending: 'break' }])
  })

  test('after a long sleep every focus span that passed is used up and tracked, only the latest ending gives a chime, and settling again does nothing', async () => {
    const { sessions, storedTimer, trackedOnDay, chimed, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 3 * HOUR)
    await sessions.settleAll(NINE + 4 * HOUR)

    expect(remainingTimeAt(await storedTimer('write-report'), NINE + 4 * HOUR)).toBe(0)
    expect(remainingTimeAt(await storedTimer('answer-email'), NINE + 4 * HOUR)).toBe(0)
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(50 * MINUTE)
    expect(await trackedOnDay('answer-email', '2026-11-17')).toBe(30 * MINUTE)
    expect(chimed).toEqual([{ sessionId: 'morning', ending: 'session' }])
    expect(wakes.has('focus session:morning')).toBe(false)
  })

  test('pausing uses up and tracks the focus so far and cancels the wake', async () => {
    const { sessions, storedTimer, trackedOnDay, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.pause('morning', NINE + 10 * MINUTE)

    expect(remainingTimeAt(await storedTimer('write-report'), NINE + HOUR)).toBe(40 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(wakes.has('focus session:morning')).toBe(false)
  })

  test('resuming sets the wake again to the end of the focus step, later by as long as the pause lasted', async () => {
    const { sessions, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    await sessions.pause('morning', NINE + 10 * MINUTE)

    await sessions.resume('morning', NINE + 40 * MINUTE)

    expect(wakes.get('focus session:morning')).toBe(NINE + 55 * MINUTE)
  })

  test('skipping a break starts the next focus step at once, and the break it skipped gives no chime', async () => {
    const { sessions, wakes, chimed } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.skip('morning', NINE + 27 * MINUTE)

    expect(wakes.get('focus session:morning')).toBe(NINE + 52 * MINUTE)
    expect(chimed).toEqual([{ sessionId: 'morning', ending: 'focus step' }])
  })

  test('ending early tracks the focus so far and leaves the session idle with no wake and no chime', async () => {
    const { sessions, storedSession, trackedOnDay, wakes, chimed } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.endEarly('morning', NINE + 10 * MINUTE)

    expect(progressAt(await storedSession('morning'), NINE + 10 * MINUTE).state).toBe('idle')
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(wakes.has('focus session:morning')).toBe(false)
    expect(chimed).toEqual([])
  })

  test('removing a running session tracks the focus so far, forgets the session and cancels its wake', async () => {
    const { sessions, storedSessions, trackedOnDay, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.remove('morning', NINE + 10 * MINUTE)

    expect(await storedSessions()).toEqual([])
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(wakes.has('focus session:morning')).toBe(false)
  })

  const LATER = NINE + 20 * MINUTE

  test.each([
    ['moving a step', ({ sessions }: Engines) => sessions.moveStep('morning', 2, 3, LATER)],
    ['sending a step to the front', ({ sessions }: Engines) => sessions.sendToFront('morning', 2, LATER)],
    ['adding the steps of a task', async ({ sessions, timers }: Engines) => {
      await timers.add({ id: 'tidy-desk', name: 'Tidy desk', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } }, LATER)
      return sessions.addTaskSteps('morning', 'tidy-desk', LATER)
    }],
    ['marking a task done', ({ sessions }: Engines) => sessions.markTaskDone('morning', 'answer-email', LATER)]
  ])('%s of a session whose run has ended is refused, saying the run has ended, and changes nothing', async (_, command) => {
    const { sessions, timers, storedSessions, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    await sessions.endEarly('morning', NINE + 10 * MINUTE)
    const [before, taskBefore] = [await storedSessions(), await storedTimer('answer-email')]

    expect(await command({ sessions, timers })).toEqual({ reason: 'run ended' })

    expect(await storedSessions()).toEqual(before)
    expect(await storedTimer('answer-email')).toEqual(taskBefore)
  })

  test('sending a step to the front during a run changes what this run does next and keeps the saved plan', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const saved = (await storedSession('morning')).plan

    await sessions.sendToFront('morning', 2, NINE + 10 * MINUTE)

    const session = await storedSession('morning')
    expect(session.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'answer-email', 'write-report', 'answer-email'])
    expect(session.plan).toEqual(saved)
  })

  test('moving a step that has become the current step by the time the command runs is refused, naming the step and its task, and the run stays as it was', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const before = (await storedSession('morning')).run?.plan

    const refusal = await sessions.moveStep('morning', 1, 3, NINE + 31 * MINUTE)

    expect(refusal).toEqual({ reason: 'not up next', task: { id: 'write-report', name: 'Write report' }, step: 1 })
    expect((await storedSession('morning')).run?.plan).toEqual(before)
  })

  test('sending to the front a step that has already passed, or moving a step before the current one, is refused naming the step', async () => {
    const { sessions } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.sendToFront('morning', 0, NINE + 31 * MINUTE)).toEqual({ reason: 'not up next', task: { id: 'write-report', name: 'Write report' }, step: 0 })
    expect(await sessions.moveStep('morning', 3, 1, NINE + 31 * MINUTE)).toEqual({ reason: 'not up next', task: { id: 'write-report', name: 'Write report' }, step: 1 })
  })

  test('adding the steps of a task with no time left is refused, naming the task, and the run stays as it was', async () => {
    const { sessions, timers, storedSession } = await setup()
    await timers.markDone('answer-email', NINE)
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)
    await sessions.start('morning', NINE)
    const before = await storedSession('morning')

    const refusal = await sessions.addTaskSteps('morning', 'answer-email', NINE + 10 * MINUTE)

    expect(refusal).toEqual({ reason: 'no time left', task: { id: 'answer-email', name: 'Answer email' } })
    expect(await storedSession('morning')).toEqual(before)
  })

  test('adding the steps of a task that the run already has is refused, naming the task and this session', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const before = (await storedSession('morning')).run?.plan

    const refusal = await sessions.addTaskSteps('morning', 'answer-email', NINE + 10 * MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedSession('morning')).run?.plan).toEqual(before)
  })

  test('adding a task to the settings of an idle session makes it one of the session\'s tasks, with steps cut from its remaining time', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)

    await sessions.change('morning', morning, NINE)

    const session = await storedSession('morning')
    expect(session.taskIds).toEqual(['write-report', 'answer-email'])
    expect(session.plan.slice(2)).toEqual([{ taskId: 'answer-email', length: 25 * MINUTE }, { taskId: 'answer-email', length: 5 * MINUTE }])
  })

  test('starting a session whose tasks have no time left is refused, naming the first task, and the session stays idle', async () => {
    const { sessions, timers, storedSession } = await setup()
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)
    await timers.markDone('write-report', NINE)

    expect(await sessions.start('morning', NINE)).toEqual({ reason: 'no time left', task: { id: 'write-report', name: 'Write report' } })
    expect((await storedSession('morning')).run).toBeNull()
  })

  test('changing a session that was removed is refused as already removed', async () => {
    const { sessions, storedSessions } = await setup()

    expect(await sessions.change('morning', morning, NINE)).toEqual({ reason: 'already removed' })
    expect(await storedSessions()).toEqual([])
  })

  test.each<[string, (engine: SessionEngine) => Promise<unknown>]>([
    ['pausing', (engine) => engine.pause('morning', NINE)],
    ['moving a step of', (engine) => engine.moveStep('morning', 1, 2, NINE)],
    ['adding the steps of a task to', (engine) => engine.addTaskSteps('morning', 'answer-email', NINE)],
    ['marking done a task of', (engine) => engine.markTaskDone('morning', 'write-report', NINE)]
  ])('%s a session that was removed is refused as already removed', async (_, command) => {
    const { sessions } = await setup()

    expect(await command(sessions)).toEqual({ reason: 'already removed' })
  })

  test('adding the steps of a task that was removed to a running session is refused as already removed, and the run stays as it was', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)
    await sessions.start('morning', NINE)
    const before = await storedSession('morning')

    expect(await sessions.addTaskSteps('morning', 'no-such-task', NINE)).toEqual({ reason: 'already removed' })
    expect(await storedSession('morning')).toEqual(before)
  })

  test('changing a session to have a task that was removed is refused as already removed, and the session stays as it was', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    const before = await storedSession('morning')

    expect(await sessions.change('morning', { ...morning, taskIds: ['write-report', 'no-such-task'] }, NINE)).toEqual({ reason: 'already removed' })
    expect(await storedSession('morning')).toEqual(before)
  })

  test('changing the step length of an idle session cuts its saved plan again', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)

    await sessions.change('morning', { ...morning, stepLength: 50 * MINUTE }, NINE)

    const session = await storedSession('morning')
    expect(session.stepLength).toBe(50 * MINUTE)
    expect(session.plan).toEqual([{ taskId: 'write-report', length: 50 * MINUTE }, { taskId: 'answer-email', length: 30 * MINUTE }])
  })

  test.each([
    ['a new name', { name: 'Early morning' }],
    ['a new break length', { breakLength: 10 * MINUTE }]
  ])('changing an idle session to %s keeps the saved plan as it was cut, though a task has used time since', async (_, settings) => {
    const { sessions, timers, storedSession } = await setup()
    await sessions.add(morning, NINE)
    const cut = (await storedSession('morning')).plan
    await timers.start('write-report', NINE)
    await timers.pause('write-report', NINE + 20 * MINUTE)

    await sessions.change('morning', { ...morning, ...settings }, NINE + 20 * MINUTE)

    expect(await storedSession('morning')).toMatchObject({ ...settings, plan: cut })
  })

  test.each([
    ['a task that is not stored', 'no-such-task'],
    ['a timer that is not a task', 'tea']
  ])('changing a session to have %s changes nothing', async (_, taskId) => {
    const { sessions, storedSessions } = await setup()
    await sessions.add(morning, NINE)
    const before = await storedSessions()

    await sessions.change('morning', { ...morning, taskIds: ['write-report', taskId] }, NINE)

    expect(await storedSessions()).toEqual(before)
  })

  test('the settings of a running session do not change until it is idle again', async () => {
    const { sessions, storedSessions } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const before = await storedSessions()

    await sessions.change('morning', { ...morning, name: 'Early morning', stepLength: 50 * MINUTE }, NINE)

    expect(await storedSessions()).toEqual(before)
  })

  test('starting a session is refused while one of its tasks runs on its own, the refusal names that task and says it runs on its own, and nothing changes', async () => {
    const { sessions, timers, storedSessions, storedTimer, wakes } = await setup()
    await sessions.add(morning, NINE)
    await timers.start('answer-email', NINE)
    const before = { sessions: await storedSessions(), task: await storedTimer('answer-email'), wakes: [...wakes] }

    const refusal = await sessions.start('morning', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: null })
    expect({ sessions: await storedSessions(), task: await storedTimer('answer-email'), wakes: [...wakes] }).toEqual(before)
  })

  test('starting a session is refused while one of its tasks is in another running session, naming that session', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    await sessions.add({ ...morning, id: 'emails', name: 'Emails', taskIds: ['answer-email'] }, NINE)
    await sessions.start('morning', NINE)

    const refusal = await sessions.start('emails', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedSession('emails')).run).toBeNull()
  })

  test('the timer engine refuses to start a task that is in a running session, naming that session', async () => {
    const { sessions, timers, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    const refusal = await timers.start('answer-email', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedTimer('answer-email')).runningSince).toBeNull()
  })

  test('adding the steps of a task that runs on its own to a running session is refused', async () => {
    const { sessions, timers, storedSession } = await setup()
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)
    await sessions.start('morning', NINE)
    await timers.start('answer-email', NINE)

    const refusal = await sessions.addTaskSteps('morning', 'answer-email', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: null })
    expect(tasksInRun(await storedSession('morning'))).toEqual(new Set(['write-report']))
  })

  test('a session that has ended frees its tasks to run on their own', async () => {
    const { sessions, timers } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    await sessions.endEarly('morning', NINE + MINUTE)

    expect(await timers.start('answer-email', NINE + 2 * MINUTE)).toBeNull()
  })

  test('removing a task that a saved session uses removes it from the session\'s tasks and saved plan', async () => {
    const { sessions, timers, storedSession } = await setup()
    await sessions.add(morning, NINE)

    await timers.remove('write-report', NINE)

    expect(await storedSession('morning')).toMatchObject({ taskIds: ['answer-email'], plan: [{ taskId: 'answer-email', length: 25 * MINUTE }, { taskId: 'answer-email', length: 5 * MINUTE }] })
  })

  test('removing a task that a running session uses is refused, naming that session, and nothing changes', async () => {
    const { sessions, timers, storedSessions, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const before = await storedSessions()

    const refusal = await timers.remove('answer-email', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect(await storedTimer('answer-email')).toMatchObject({ name: 'Answer email' })
    expect(await storedSessions()).toEqual(before)
  })

  test('the timer engine refuses to mark done a task that is in a running session, naming that session, and the task keeps its time', async () => {
    const { sessions, timers, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    const refusal = await timers.markDone('answer-email', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    const task = await storedTimer('answer-email')
    expect(task.remainingTime).toBe(30 * MINUTE)
    expect(task.done).toBeUndefined()
  })

  test('the timer engine refuses to reset a task that is in a running session, naming that session, and the task keeps what it has left', async () => {
    const { sessions, timers, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    const refusal = await timers.reset('write-report', NINE + 10 * MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } })
    await sessions.settleAll(NINE + 10 * MINUTE)
    expect((await storedTimer('write-report')).remainingTime).toBe(40 * MINUTE)
  })

  test('the timer engine refuses to undo done a task that is in a paused session, naming that session, and the task stays done', async () => {
    const { sessions, timers, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    await sessions.markTaskDone('morning', 'write-report', NINE + 10 * MINUTE)
    await sessions.pause('morning', NINE + 12 * MINUTE)

    const refusal = await timers.undoDone('write-report', NINE + 20 * MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedTimer('write-report')).done?.at).toBe(NINE + 10 * MINUTE)
  })

  test('marking done from up next a task of the run marks it done and takes its steps out of up next for this run only, keeping the saved plan', async () => {
    const { sessions, storedSession, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    const saved = (await storedSession('morning')).plan

    expect(await sessions.markTaskDone('morning', 'answer-email', NINE + 10 * MINUTE)).toBeNull()

    expect(await storedTimer('answer-email')).toMatchObject({ remainingTime: 0, done: { at: NINE + 10 * MINUTE, remainingTimeBefore: 30 * MINUTE } })
    const session = await storedSession('morning')
    expect(session.run?.plan).toEqual([{ taskId: 'write-report', length: 25 * MINUTE }, { taskId: 'write-report', length: 25 * MINUTE }])
    expect(session.plan).toEqual(saved)
  })

  test('marking done from up next the task of the current focus step ends that step at once, so its break starts, and takes out its later steps', async () => {
    const { sessions, storedSession, storedTimer, trackedOnDay, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.markTaskDone('morning', 'write-report', NINE + 10 * MINUTE)).toBeNull()

    expect((await storedTimer('write-report')).done).toEqual({ at: NINE + 10 * MINUTE, remainingTimeBefore: 40 * MINUTE })
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    const session = await storedSession('morning')
    expect(session.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'answer-email', 'answer-email'])
    expect(progressAt(session, NINE + 10 * MINUTE)).toMatchObject({ state: 'break', currentStep: 0, remainingTime: 5 * MINUTE })
    expect(progressAt(session, NINE + 15 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 1, remainingTime: 25 * MINUTE })
    expect(wakes.get('focus session:morning')).toBe(NINE + 15 * MINUTE)
  })

  test('marking done from up next the task of the current focus step of a session without breaks starts the next focus step at once', async () => {
    const { sessions, storedSession, wakes } = await setup()
    await sessions.add({ ...morning, breakLength: 0 }, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.markTaskDone('morning', 'write-report', NINE + 10 * MINUTE)).toBeNull()

    expect(progressAt(await storedSession('morning'), NINE + 10 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 1, remainingTime: 25 * MINUTE })
    expect(wakes.get('focus session:morning')).toBe(NINE + 35 * MINUTE)
  })

  test('marking done from up next the task of the current focus step of a paused session ends that step and leaves the break paused, keeping the delay', async () => {
    const { sessions, storedSession } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)
    await sessions.pause('morning', NINE + 10 * MINUTE)

    expect(await sessions.markTaskDone('morning', 'write-report', NINE + 20 * MINUTE)).toBeNull()

    expect(progressAt(await storedSession('morning'), NINE + 20 * MINUTE)).toMatchObject({ state: 'paused', pausedIn: 'break', remainingTime: 5 * MINUTE, delay: 10 * MINUTE })
  })

  test('marking done from up next the task of the last focus step ends the run, so the session is idle again with no wake', async () => {
    const { sessions, storedSession, storedTimer, wakes } = await setup()
    await sessions.add({ ...morning, order: 'alternating' }, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.markTaskDone('morning', 'answer-email', NINE + 93 * MINUTE)).toBeNull()

    expect((await storedTimer('answer-email')).done?.at).toBe(NINE + 93 * MINUTE)
    expect(progressAt(await storedSession('morning'), NINE + 93 * MINUTE).state).toBe('idle')
    expect(wakes.has('focus session:morning')).toBe(false)
  })

  test('marking done from a session a task that the run of another session uses is refused, naming that session', async () => {
    const { sessions, storedTimer } = await setup()
    await sessions.add({ ...morning, taskIds: ['answer-email'] }, NINE)
    await sessions.add({ ...morning, id: 'emails', name: 'Emails', taskIds: ['write-report'] }, NINE)
    await sessions.start('morning', NINE)
    await sessions.start('emails', NINE)

    const refusal = await sessions.markTaskDone('emails', 'answer-email', NINE + MINUTE)

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'answer-email', name: 'Answer email' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedTimer('answer-email')).done).toBeUndefined()
  })

  test('a repeating task in a run that goes on past midnight into a repeat day does not come back until the run ends, then comes back full', async () => {
    const { sessions, timers, storedTimer } = await setup()
    const tuesdayLate = Date.UTC(2026, 10, 17, 23, 50)
    await timers.add({ id: 'reading', name: 'Reading', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'green' }, repeatDays: [0, 1, 2, 3, 4, 5, 6] }, NINE)
    await timers.start('reading', NINE)
    await timers.pause('reading', NINE + 10 * MINUTE)
    await sessions.add({ ...morning, id: 'night', name: 'Night', taskIds: ['reading'] }, tuesdayLate)
    await sessions.start('night', tuesdayLate)

    await sessions.settleAll(tuesdayLate + 20 * MINUTE)
    expect(remainingTimeAt(await storedTimer('reading'), tuesdayLate + 20 * MINUTE)).toBe(20 * MINUTE)

    await sessions.settleAll(tuesdayLate + 50 * MINUTE)
    expect(await storedTimer('reading')).toMatchObject({ remainingTime: 50 * MINUTE, runningSince: null })
    expect((await storedTimer('reading')).done).toBeUndefined()
  })

  test('a task that a session brings to zero is finished without ringing', async () => {
    const { sessions, storedTimer, rang } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 3 * HOUR)

    expect(runStateAt(await storedTimer('write-report'), NINE + 3 * HOUR)).toBe('finished')
    expect(rang).toEqual([])
  })

  test('a timer command and a session command sent at the same time both take effect', async () => {
    const { sessions, timers, storedSession, storedTimer } = await setup()
    await sessions.add({ ...morning, taskIds: ['write-report'] }, NINE)

    await Promise.all([sessions.start('morning', NINE), timers.start('answer-email', NINE)])

    expect((await storedSession('morning')).run).not.toBeNull()
    expect((await storedTimer('answer-email')).runningSince).toBe(NINE)
  })

  test('a timer and a session with the same id each keep their own wake', async () => {
    const { sessions, timers, wakes } = await setup()
    await timers.add({ ...tea, id: 'morning' }, NINE)
    await sessions.add(morning, NINE)
    await timers.start('morning', NINE)
    await sessions.start('morning', NINE)

    await sessions.pause('morning', NINE + MINUTE)

    expect([...wakes]).toEqual([['timer:morning', NINE + 3 * MINUTE]])
  })

  test.each([
    ['change', (engine: SessionEngine) => engine.change('evening', { ...morning, name: 'Evening' }, NINE)],
    ['remove', (engine: SessionEngine) => engine.remove('evening', NINE)],
    ['start', (engine: SessionEngine) => engine.start('evening', NINE)],
    ['pause', (engine: SessionEngine) => engine.pause('evening', NINE)],
    ['resume', (engine: SessionEngine) => engine.resume('evening', NINE)],
    ['skip', (engine: SessionEngine) => engine.skip('evening', NINE)],
    ['endEarly', (engine: SessionEngine) => engine.endEarly('evening', NINE)],
    ['moveStep', (engine: SessionEngine) => engine.moveStep('evening', 2, 0, NINE)],
    ['sendToFront', (engine: SessionEngine) => engine.sendToFront('evening', 2, NINE)],
    ['addTaskSteps', (engine: SessionEngine) => engine.addTaskSteps('evening', 'answer-email', NINE)],
    ['markTaskDone', (engine: SessionEngine) => engine.markTaskDone('evening', 'answer-email', NINE)]
  ])('%s of a session that is not stored changes nothing', async (_, command) => {
    const { sessions, storedSessions, storedTimer, wakes } = await setup()
    await sessions.add(morning, NINE)
    const before = await storedSessions()

    await command(sessions)

    expect(await storedSessions()).toEqual(before)
    expect((await storedTimer('answer-email')).done).toBeUndefined()
    expect(wakes.size).toBe(0)
  })
})

describe('skipping today a repeating task that the run of a focus session uses', () => {
  /** Morning, with write report repeating on Tuesdays, the day of NINE. */
  async function morningWithRepeatingReport() {
    const engines = await setup()
    await engines.timers.change('write-report', { name: writeReport.name, plannedTime: writeReport.plannedTime, appearance: writeReport.appearance, repeatDays: [2] }, NINE)
    await engines.sessions.add(morning, NINE)
    await engines.sessions.start('morning', NINE)
    return engines
  }

  test('skipping the task of the current focus step ends that step at once, so its break starts, takes its later steps out of up next and keeps the saved plan', async () => {
    const { timers, storedSession, storedTimer, trackedOnDay, wakes } = await morningWithRepeatingReport()
    const saved = (await storedSession('morning')).plan

    expect(await timers.skipToday('write-report', NINE + 10 * MINUTE)).toBeNull()

    expect((await storedTimer('write-report')).done).toEqual({ at: NINE + 10 * MINUTE, remainingTimeBefore: 40 * MINUTE, skipped: true })
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    const session = await storedSession('morning')
    expect(session.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'answer-email', 'answer-email'])
    expect(progressAt(session, NINE + 10 * MINUTE)).toMatchObject({ state: 'break', currentStep: 0, remainingTime: 5 * MINUTE })
    expect(wakes.get('focus session:morning')).toBe(NINE + 15 * MINUTE)
    expect(session.plan).toEqual(saved)
  })

  test('skipping saves the skipped task and the run it leaves in one write', async () => {
    const { timers, saves } = await morningWithRepeatingReport()
    const savesBefore = saves.length

    await timers.skipToday('write-report', NINE + 10 * MINUTE)

    expect(saves).toHaveLength(savesBefore + 1)
    const saved = saves.at(-1)
    expect(saved?.timers.find(({ id }) => id === 'write-report')?.done?.skipped).toBe(true)
    expect(saved?.sessions.find(({ id }) => id === 'morning')?.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'answer-email', 'answer-email'])
  })

  test('skipping a task whose steps are only up next takes them out of up next and leaves the current focus step running', async () => {
    const { timers, sessions, storedSession, storedTimer } = await setup()
    await timers.change('answer-email', { name: answerEmail.name, plannedTime: answerEmail.plannedTime, appearance: answerEmail.appearance, repeatDays: [2] }, NINE)
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    expect(await timers.skipToday('answer-email', NINE + 10 * MINUTE)).toBeNull()

    expect((await storedTimer('answer-email')).done).toEqual({ at: NINE + 10 * MINUTE, remainingTimeBefore: 30 * MINUTE, skipped: true })
    const session = await storedSession('morning')
    expect(session.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'write-report'])
    expect(progressAt(session, NINE + 10 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 0, remainingTime: 15 * MINUTE })
  })

  test('skipping the task of the current focus step of a paused run ends that step and leaves the break paused, keeping the delay', async () => {
    const { timers, sessions, storedSession, storedTimer } = await morningWithRepeatingReport()
    await sessions.pause('morning', NINE + 10 * MINUTE)

    expect(await timers.skipToday('write-report', NINE + 20 * MINUTE)).toBeNull()

    expect((await storedTimer('write-report')).done).toEqual({ at: NINE + 20 * MINUTE, remainingTimeBefore: 40 * MINUTE, skipped: true })
    const session = await storedSession('morning')
    expect(session.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'answer-email', 'answer-email'])
    expect(progressAt(session, NINE + 20 * MINUTE)).toMatchObject({ state: 'paused', pausedIn: 'break', remainingTime: 5 * MINUTE, delay: 10 * MINUTE })
  })

  test('undoing done on a skipped task is refused while the run goes on, naming the session, and the task stays skipped', async () => {
    const { timers, storedTimer } = await morningWithRepeatingReport()
    await timers.skipToday('write-report', NINE + 10 * MINUTE)

    expect(await timers.undoDone('write-report', NINE + 20 * MINUTE)).toEqual({ reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedTimer('write-report')).done?.skipped).toBe(true)
  })
})

describe('running focus session commands', () => {
  test('a markTaskDone command marks the task done from the session\'s up next', async () => {
    const { sessions, storedSession, storedTimer } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.run({ type: 'markTaskDone', sessionId: 'morning', taskId: 'answer-email' }, NINE + MINUTE)).toBeNull()

    expect((await storedTimer('answer-email')).done?.at).toBe(NINE + MINUTE)
    expect(tasksInRun(await storedSession('morning'))).toEqual(new Set(['write-report']))
  })
})

describe('pinning a focus session', () => {
  test('a pin command stores the running session pinned and leaves its run and wake as they were, and an unpin command takes the pin away', async () => {
    const { sessions, storedSession, wakes } = await setup()
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    expect(await sessions.run({ type: 'pin', sessionId: 'morning' }, NINE + 10 * MINUTE)).toBeNull()

    const pinned = await storedSession('morning')
    expect(isPinned(pinned)).toBe(true)
    expect(progressAt(pinned, NINE + 10 * MINUTE)).toMatchObject({ state: 'focus step', remainingTime: 15 * MINUTE })
    expect(wakes.get('focus session:morning')).toBe(NINE + 25 * MINUTE)
    await sessions.run({ type: 'unpin', sessionId: 'morning' }, NINE + 10 * MINUTE)
    expect(isPinned(await storedSession('morning'))).toBe(false)
  })
})
