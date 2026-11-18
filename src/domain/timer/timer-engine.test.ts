import { createMemoryChimer } from '@/infrastructure/memory/chimer'
import { createMemoryRepeatDayResultStore } from '@/infrastructure/memory/repeat-day-result-store'
import { createMemoryRinger } from '@/infrastructure/memory/ringer'
import { createMemorySessionStore } from '@/infrastructure/memory/session-store'
import { createMemoryTimerStore } from '@/infrastructure/memory/timer-store'
import { createMemoryTimersAndSessionsStore } from '@/infrastructure/memory/timers-and-sessions-store'
import { createMemoryTrackedTimeStore } from '@/infrastructure/memory/tracked-time-store'
import { createMemoryWakeScheduler } from '@/infrastructure/memory/wake-scheduler'
import { createCommandQueue } from '../command/command-queue'
import { createCommandRunner } from '../command/command-runner'
import { createTimerEngine } from './timer-engine'
import { isPinned, remainingTimeAt, runStateAt } from './model/timer'
import type { DayOf } from '@/utils/time/calendar'
import { trackedOn } from '../tracking/model/tracked-time'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const NINE = Date.UTC(2026, 10, 17, 9)

/** Days in UTC, so the tests do not depend on the machine's time zone. */
const dayOf: DayOf = (moment) => {
  const startsAt = moment - moment % DAY
  return { day: new Date(startsAt).toISOString().slice(0, 10), endsAt: startsAt + DAY }
}

function setup() {
  const timerStore = createMemoryTimerStore()
  const wakeScheduler = createMemoryWakeScheduler()
  const trackedTimeStore = createMemoryTrackedTimeStore()
  const repeatDayResultStore = createMemoryRepeatDayResultStore()
  const ringer = createMemoryRinger()
  const run = createCommandRunner({
    inTurn: createCommandQueue(), store: createMemoryTimersAndSessionsStore(timerStore, createMemorySessionStore()), trackedTimeStore, repeatDayResultStore, wakeScheduler, ringer, chimer: createMemoryChimer(), dayOf
  })
  const engine = createTimerEngine(run)
  async function storedTimer(id: string) {
    const timer = (await timerStore.load()).find((stored) => stored.id === id)
    if (timer === undefined) {
      throw new Error(`No stored timer ${id}`)
    }
    return timer
  }
  async function trackedOnDay(taskId: string, day: string) {
    return trackedOn(await trackedTimeStore.load(), taskId, day)
  }
  async function storedIds() {
    return (await timerStore.load()).map((timer) => timer.id)
  }
  return { engine, engineOnTheSameRunner: createTimerEngine(run), storedTimer, storedIds, trackedOnDay, repeatDayResults: () => repeatDayResultStore.load(), wakeScheduler, wakes: wakeScheduler.wakes, wakesSet: wakeScheduler.set, rang: ringer.rang }
}

const writeReport = { id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' } } as const
const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const

describe('the timer engine', () => {
  test('an added timer is stored idle with all of its planned time', async () => {
    const { engine, storedTimer } = setup()

    await engine.add(writeReport, NINE)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, NINE)).toBe('idle')
    expect(remainingTimeAt(timer, NINE)).toBe(25 * MINUTE)
  })

  test('adding a timer whose id is already stored changes nothing', async () => {
    const { engine, storedTimer, storedIds } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.add({ ...writeReport, name: 'Another report', plannedTime: 5 * MINUTE }, NINE)

    expect(await storedIds()).toEqual(['write-report'])
    expect(await storedTimer('write-report')).toMatchObject({ name: 'Write report', runningSince: NINE, remainingTime: 25 * MINUTE })
  })

  test('a started timer is running and counts down from the moment it started', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(writeReport, NINE)

    await engine.start('write-report', NINE)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, NINE + 10 * MINUTE)).toBe('running')
    expect(remainingTimeAt(timer, NINE + 10 * MINUTE)).toBe(15 * MINUTE)
  })

  test('starting a timer schedules a wake at the moment it will finish', async () => {
    const { engine, wakes } = setup()
    await engine.add(writeReport, NINE)

    await engine.start('write-report', NINE)

    expect(wakes.get('timer:write-report')).toBe(NINE + 25 * MINUTE)
  })

  test('starting a timer that is already running is refused, saying it runs on its own', async () => {
    const { engine } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    expect(await engine.start('tea', NINE + MINUTE)).toEqual({ reason: 'task in use', task: { id: 'tea', name: 'Tea' }, usedIn: null })
  })

  test('starting a finished timer is refused, saying it has no time left', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    expect(await engine.start('tea', NINE + 5 * MINUTE)).toEqual({ reason: 'no time left', task: { id: 'tea', name: 'Tea' } })
    expect(runStateAt(await storedTimer('tea'), NINE + 5 * MINUTE)).toBe('finished')
  })

  test('a command that leaves a running timer\'s wake at the same moment does not set it again', async () => {
    const { engine, wakesSet } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.add(tea, NINE + MINUTE)

    expect(wakesSet).toEqual([['timer:write-report', NINE + 25 * MINUTE]])
  })

  test('a running timer\'s wake that the scheduler lost, as when the background stopped after saving, is set again by the next command', async () => {
    const { engine, wakeScheduler, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)
    await wakeScheduler.cancel({ of: 'timer', id: 'write-report' })

    await engine.add(tea, NINE + MINUTE)

    expect([...wakes]).toEqual([['timer:write-report', NINE + 25 * MINUTE]])
  })

  test('a wake the scheduler still has for a paused timer, as when the background stopped before cancelling it, is cancelled by the next command', async () => {
    const { engine, wakeScheduler, wakes } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)
    await engine.pause('tea', NINE + MINUTE)
    await wakeScheduler.wakeAt({ of: 'timer', id: 'tea' }, NINE + 3 * MINUTE)

    await engine.add(writeReport, NINE + 2 * MINUTE)

    expect([...wakes]).toEqual([])
  })

  test('a timer command leaves the wakes of alarms as they are', async () => {
    const { engine, wakeScheduler, wakes } = setup()
    await wakeScheduler.wakeAt({ of: 'alarm', id: 'tea' }, NINE + HOUR)

    await engine.add(tea, NINE)

    expect([...wakes]).toEqual([['alarm:tea', NINE + HOUR]])
  })

  test('pausing a running task records the span it ran as tracked time on that day', async () => {
    const { engine, trackedOnDay } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.pause('write-report', NINE + 10 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
  })

  test('pausing a timer that is not a task records no tracked time', async () => {
    const { engine, trackedOnDay } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    await engine.pause('tea', NINE + MINUTE)

    expect(await trackedOnDay('tea', '2026-11-17')).toBe(0)
  })

  test('pausing a timer cancels its wake', async () => {
    const { engine, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.pause('write-report', NINE + 10 * MINUTE)

    expect(wakes.has('timer:write-report')).toBe(false)
  })

  test('resetting a running task records the span it ran and gives it all of its planned time back', async () => {
    const { engine, storedTimer, trackedOnDay } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.reset('write-report', NINE + 10 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(runStateAt(await storedTimer('write-report'), NINE + HOUR)).toBe('idle')
  })

  test('resetting a timer cancels its wake', async () => {
    const { engine, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.reset('write-report', NINE + 10 * MINUTE)

    expect(wakes.has('timer:write-report')).toBe(false)
  })

  test('a removed timer is no longer stored and has no wake', async () => {
    const { engine, storedIds, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)
    await engine.start('write-report', NINE)

    await engine.remove('write-report', NINE + 10 * MINUTE)

    expect(await storedIds()).toEqual(['tea'])
    expect(wakes.has('timer:write-report')).toBe(false)
  })

  test('removing a running task records the span it ran until it was removed', async () => {
    const { engine, trackedOnDay } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.remove('write-report', NINE + 10 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
  })

  test('settling a running timer that has run out finishes it and rings it', async () => {
    const { engine, storedTimer, rang } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    await engine.settleAll(NINE + 3 * MINUTE)

    expect(runStateAt(await storedTimer('tea'), NINE + HOUR)).toBe('finished')
    expect(rang).toEqual(['tea'])
  })

  test('settling a task that ran out long ago tracks it only until the moment it finished', async () => {
    const { engine, trackedOnDay } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.settleAll(NINE + 3 * HOUR)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(25 * MINUTE)
  })

  test('settling again after a timer rang does not ring it again', async () => {
    const { engine, rang } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)
    await engine.settleAll(NINE + 3 * MINUTE)

    await engine.settleAll(NINE + 4 * MINUTE)

    expect(rang).toEqual(['tea'])
  })

  test('starting a timer that ran out while nobody looked rings it, and the start is refused as it has no time left', async () => {
    const { engine, storedTimer, rang } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    const refusal = await engine.start('tea', NINE + HOUR)

    expect(refusal).toEqual({ reason: 'no time left', task: { id: 'tea', name: 'Tea' } })
    expect(rang).toEqual(['tea'])
    expect(runStateAt(await storedTimer('tea'), NINE + HOUR)).toBe('finished')
  })

  test('pausing a timer that ran out while nobody looked rings it once', async () => {
    const { engine, rang } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    await engine.pause('tea', NINE + HOUR)
    await engine.settleAll(NINE + HOUR)

    expect(rang).toEqual(['tea'])
  })

  test('a task paused after midnight is tracked on both days', async () => {
    const { engine, trackedOnDay } = setup()
    const nearMidnight = Date.UTC(2026, 10, 17, 23, 50)
    await engine.add(writeReport, NINE)
    await engine.start('write-report', nearMidnight)

    await engine.pause('write-report', nearMidnight + 15 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-18')).toBe(5 * MINUTE)
  })

  test('timers running at the same time do not affect each other', async () => {
    const { engine, storedTimer, trackedOnDay, wakes, rang } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)
    await engine.start('write-report', NINE)
    await engine.start('tea', NINE + MINUTE)

    await engine.settleAll(NINE + 4 * MINUTE)

    expect(rang).toEqual(['tea'])
    expect(runStateAt(await storedTimer('tea'), NINE + HOUR)).toBe('finished')
    expect(runStateAt(await storedTimer('write-report'), NINE + 4 * MINUTE)).toBe('running')
    expect([...wakes]).toEqual([['timer:write-report', NINE + 25 * MINUTE]])

    await engine.pause('write-report', NINE + 10 * MINUTE)

    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
  })

  test('a command for one timer first rings another that ran out while nobody looked', async () => {
    const { engine, rang } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    await engine.start('write-report', NINE + 10 * MINUTE)

    expect(rang).toEqual(['tea'])
  })

  test.each(['start', 'pause', 'reset', 'remove'] as const)('%s for a timer that is not stored changes nothing', async (command) => {
    const { engine, storedTimer, storedIds, wakes, rang } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)
    await engine.start('write-report', NINE)

    await engine[command]('no-such-timer', NINE + 10 * MINUTE)

    expect(await storedIds()).toEqual(['write-report', 'tea'])
    expect(runStateAt(await storedTimer('tea'), NINE + HOUR)).toBe('idle')
    expect(await storedTimer('write-report')).toMatchObject({ runningSince: NINE, remainingTime: 25 * MINUTE })
    expect([...wakes]).toEqual([['timer:write-report', NINE + 25 * MINUTE]])
    expect(rang).toEqual([])
  })

  test('two commands that arrive at the same time both take effect', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)

    await Promise.all([engine.start('write-report', NINE), engine.start('tea', NINE)])

    expect(runStateAt(await storedTimer('write-report'), NINE + MINUTE)).toBe('running')
    expect(runStateAt(await storedTimer('tea'), NINE + MINUTE)).toBe('running')
  })

  test('two engines that share one runner never overwrite each other\'s commands', async () => {
    const { engine, engineOnTheSameRunner, storedTimer } = setup()
    await engine.add(writeReport, NINE)
    await engine.add(tea, NINE)

    await Promise.all([engine.start('write-report', NINE), engineOnTheSameRunner.start('tea', NINE)])

    expect(runStateAt(await storedTimer('write-report'), NINE + MINUTE)).toBe('running')
    expect(runStateAt(await storedTimer('tea'), NINE + MINUTE)).toBe('running')
  })

  test('a command that fails does not hold up the commands after it', async () => {
    const { engine, storedIds } = setup()

    await expect(engine.add({ ...tea, plannedTime: 0 }, NINE)).rejects.toThrow('planned time')
    await engine.add(tea, NINE)

    expect(await storedIds()).toEqual(['tea'])
  })

  test('changing a running task stores its new details, tracks the span it ran so far and moves its wake to its new finish', async () => {
    const { engine, storedTimer, trackedOnDay, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.change('write-report', { name: 'Write the report', plannedTime: 40 * MINUTE, appearance: { colour: 'violet' } }, NINE + 10 * MINUTE)

    expect(await storedTimer('write-report')).toMatchObject({ name: 'Write the report', plannedTime: 40 * MINUTE, appearance: { colour: 'violet' } })
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(wakes.get('timer:write-report')).toBe(NINE + 40 * MINUTE)
  })
})

describe('pinning a timer', () => {
  test('a pin command stores the timer pinned and leaves it running with its wake, and an unpin command takes the pin away', async () => {
    const { engine, storedTimer, wakes } = setup()
    await engine.add(tea, NINE)
    await engine.start('tea', NINE)

    expect(await engine.run({ type: 'pin', timerId: 'tea' }, NINE + MINUTE)).toBeNull()

    const pinned = await storedTimer('tea')
    expect(isPinned(pinned)).toBe(true)
    expect(runStateAt(pinned, NINE + MINUTE)).toBe('running')
    expect(wakes.get('timer:tea')).toBe(NINE + 3 * MINUTE)
    await engine.run({ type: 'unpin', timerId: 'tea' }, NINE + MINUTE)
    expect(isPinned(await storedTimer('tea'))).toBe(false)
  })

  test('pinning a timer that is not stored is refused, saying it was already removed', async () => {
    const { engine } = setup()

    expect(await engine.run({ type: 'pin', timerId: 'tea' }, NINE)).toEqual({ reason: 'already removed' })
  })
})

describe('a command for a timer that is not stored', () => {
  test('is refused, saying the timer was already removed', async () => {
    const { engine, storedIds } = setup()
    await engine.add(tea, NINE)

    expect(await engine.start('write-report', NINE)).toEqual({ reason: 'already removed' })
    expect(await storedIds()).toEqual(['tea'])
  })
})

describe('tasks over days', () => {
  test('marking a running task done stops it with no remaining time, tracks the span it ran and cancels its wake', async () => {
    const { engine, storedTimer, trackedOnDay, wakes } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)

    await engine.markDone('write-report', NINE + 10 * MINUTE)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, NINE + HOUR)).toBe('finished')
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(wakes.has('timer:write-report')).toBe(false)
  })

  test('undoing done gives a task marked done back the remaining time it had', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(writeReport, NINE)
    await engine.start('write-report', NINE)
    await engine.markDone('write-report', NINE + 10 * MINUTE)

    await engine.undoDone('write-report', NINE + HOUR)

    expect(remainingTimeAt(await storedTimer('write-report'), NINE + 2 * HOUR)).toBe(15 * MINUTE)
  })

  test('a repeating task done on Tuesday is stored back with all of its planned time by the first command after several repeat days, and Tuesday keeps its tracked time', async () => {
    const { engine, storedTimer, trackedOnDay } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.markDone('write-report', NINE + 10 * MINUTE)

    await engine.settleAll(NINE + 9 * DAY)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, NINE + 9 * DAY)).toBe('idle')
    expect(remainingTimeAt(timer, NINE + 9 * DAY)).toBe(25 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
  })

  test('a repeating task paused unfinished on Tuesday is stored back with all of its planned time by the first command after several repeat days, and Tuesday keeps its tracked time', async () => {
    const { engine, storedTimer, trackedOnDay } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.pause('write-report', NINE + 10 * MINUTE)

    await engine.settleAll(NINE + 9 * DAY)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, NINE + 9 * DAY)).toBe('idle')
    expect(remainingTimeAt(timer, NINE + 9 * DAY)).toBe(25 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
  })

  test('a repeating task left running from late on Tuesday is back idle with all of its planned time on Wednesday, and its span is tracked once on each day without a ring', async () => {
    const { engine, storedTimer, trackedOnDay, wakes, rang } = setup()
    const lateOnTuesday = NINE + 14 * HOUR + 50 * MINUTE
    await engine.add({ ...writeReport, repeatDays: [2, 3] }, NINE)
    await engine.start('write-report', lateOnTuesday)

    await engine.settleAll(lateOnTuesday + 20 * MINUTE)
    await engine.settleAll(lateOnTuesday + 40 * MINUTE)

    const timer = await storedTimer('write-report')
    expect(runStateAt(timer, lateOnTuesday + 40 * MINUTE)).toBe('idle')
    expect(remainingTimeAt(timer, lateOnTuesday + 40 * MINUTE)).toBe(25 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(await trackedOnDay('write-report', '2026-11-18')).toBe(10 * MINUTE)
    expect(wakes.has('timer:write-report')).toBe(false)
    expect(rang).toEqual([])
  })

  test('a repeating task paused unfinished on Tuesday keeps how Tuesday went when it comes back on Thursday: its planned time, the time tracked and that it was not finished', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.pause('write-report', NINE + 10 * MINUTE)

    await engine.settleAll(NINE + 2 * DAY)

    expect(await repeatDayResults()).toEqual({ 'write-report': { '2026-11-17': { planned: 25 * MINUTE, tracked: 10 * MINUTE, finished: false } } })
  })

  test('a repeating task done on Tuesday that comes back only after the browser was closed over several repeat days keeps Tuesday as finished and each missed repeat day as not finished with nothing tracked', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.markDone('write-report', NINE + 10 * MINUTE)

    await engine.settleAll(NINE + 9 * DAY)

    expect(await repeatDayResults()).toEqual({
      'write-report': {
        '2026-11-17': { planned: 25 * MINUTE, tracked: 10 * MINUTE, finished: true },
        '2026-11-19': { planned: 25 * MINUTE, tracked: 0, finished: false },
        '2026-11-24': { planned: 25 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a repeating task never used on a repeat day keeps that day as not finished with nothing tracked, after the browser was closed over the next repeat days, and keeps nothing for a repeat day before it was added', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add({ ...writeReport, repeatDays: [1, 2, 4] }, NINE)

    await engine.settleAll(NINE + 7 * DAY)

    expect(await repeatDayResults()).toEqual({
      'write-report': {
        '2026-11-17': { planned: 25 * MINUTE, tracked: 0, finished: false },
        '2026-11-19': { planned: 25 * MINUTE, tracked: 0, finished: false },
        '2026-11-23': { planned: 25 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a repeating task that came back and was not used on its next repeat day keeps that day as not finished once the one after begins, with the browser open on each day', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.pause('write-report', NINE + 10 * MINUTE)

    await engine.settleAll(NINE + 2 * DAY)
    await engine.settleAll(NINE + 3 * DAY)
    await engine.settleAll(NINE + 7 * DAY)

    expect(await repeatDayResults()).toEqual({
      'write-report': {
        '2026-11-17': { planned: 25 * MINUTE, tracked: 10 * MINUTE, finished: false },
        '2026-11-19': { planned: 25 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a one-time task changed to repeat keeps results only from the day it got its repeat days, and a change of its repeat days starts them again from that day', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add(writeReport, NINE)
    await engine.change('write-report', { ...writeReport, repeatDays: [2, 4] }, NINE + 2 * DAY)
    await engine.change('write-report', { ...writeReport, repeatDays: [2, 4] }, NINE + 3 * DAY)
    await engine.change('write-report', { ...writeReport, repeatDays: [3, 4] }, NINE + 7 * DAY)

    await engine.settleAll(NINE + 9 * DAY)

    expect(await repeatDayResults()).toEqual({
      'write-report': {
        '2026-11-19': { planned: 25 * MINUTE, tracked: 0, finished: false },
        '2026-11-25': { planned: 25 * MINUTE, tracked: 0, finished: false }
      }
    })
  })

  test('a repeat day result keeps the planned time the task had when it came back, whatever the planned time becomes later', async () => {
    const { engine, repeatDayResults } = setup()
    await engine.add({ ...writeReport, repeatDays: [2, 4] }, NINE)
    await engine.start('write-report', NINE)
    await engine.pause('write-report', NINE + 10 * MINUTE)
    await engine.change('write-report', { ...writeReport, plannedTime: 40 * MINUTE, repeatDays: [2, 4] }, NINE + DAY)

    await engine.settleAll(NINE + 2 * DAY)
    await engine.change('write-report', { ...writeReport, plannedTime: 15 * MINUTE, repeatDays: [2, 4] }, NINE + 2 * DAY + HOUR)

    expect(await repeatDayResults()).toEqual({ 'write-report': { '2026-11-17': { planned: 40 * MINUTE, tracked: 10 * MINUTE, finished: false } } })
  })

  test('a done one-time task changed to repeat on Thursday is stored with that repeat day and is back on Thursday', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(writeReport, NINE)
    await engine.markDone('write-report', NINE)

    await engine.change('write-report', { ...writeReport, repeatDays: [4] }, NINE + HOUR)
    await engine.settleAll(NINE + 2 * DAY)

    const timer = await storedTimer('write-report')
    expect(timer.repeatDays).toEqual([4])
    expect(runStateAt(timer, NINE + 2 * DAY)).toBe('idle')
  })

  test('changing a plain timer to repeat is refused, since timers do not repeat', async () => {
    const { engine, storedTimer } = setup()
    await engine.add(tea, NINE)

    await expect(engine.change('tea', { ...tea, repeatDays: [4] }, NINE)).rejects.toThrow('repeat')
    expect((await storedTimer('tea')).repeatDays).toBeUndefined()
  })
})

describe('what the sound owners did', () => {
  test('each command hands on what it did to the sound owners, a timer that ran out while nobody looked included', async () => {
    const heard: unknown[] = []
    const run = createCommandRunner({
      inTurn: createCommandQueue(),
      store: createMemoryTimersAndSessionsStore(createMemoryTimerStore(), createMemorySessionStore()),
      trackedTimeStore: createMemoryTrackedTimeStore(),
      repeatDayResultStore: createMemoryRepeatDayResultStore(),
      wakeScheduler: createMemoryWakeScheduler(),
      ringer: createMemoryRinger(),
      chimer: createMemoryChimer(),
      dayOf,
      soundOwners: (events) => heard.push(events)
    })
    const engine = createTimerEngine(run)
    await engine.add(tea, NINE)
    await engine.add({ ...tea, id: 'pasta', name: 'Pasta', plannedTime: 10 * MINUTE }, NINE)
    await engine.start('tea', NINE)

    await engine.start('pasta', NINE + 4 * MINUTE)

    expect(heard).toEqual([
      [{ type: 'owner started', owner: { of: 'timer', id: 'tea' } }],
      [{ type: 'owner finished', owner: { of: 'timer', id: 'tea' } }, { type: 'owner started', owner: { of: 'timer', id: 'pasta' } }]
    ])
  })
})
