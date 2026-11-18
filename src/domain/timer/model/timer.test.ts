import { localDayOf } from '@/domain/tracking/local-day'
import { comeBack, createTimer, finishesAt, isForToday, isPinned, markDone, undoDone, pause, pin, remainingTimeAt, reset, runStateAt, settle, start, unpin, useUp, withDetails, type NewTimer } from './timer'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NINE = Date.UTC(2026, 10, 17, 9)

function newTask() {
  return createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' } })
}

function taskRunningSinceNine() {
  return start(newTask(), NINE).timer
}

function taskPausedAtTenPastNine() {
  return pause(taskRunningSinceNine(), NINE + 10 * MINUTE).timer
}

function finishedTask() {
  return settle(taskRunningSinceNine(), NINE + 30 * MINUTE).timer
}

describe('creating a timer', () => {
  test('a new timer is idle with all of its planned time', () => {
    const task = newTask()

    expect(runStateAt(task, NINE)).toBe('idle')
    expect(remainingTimeAt(task, NINE)).toBe(25 * MINUTE)
  })

  test('a timer keeps the description it was given', () => {
    const tea = createTimer({ id: 'tea', name: 'Tea', description: 'Green tea, three minutes', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })

    expect(tea.description).toBe('Green tea, three minutes')
  })

  test.each([
    ['zero', 0],
    ['negative', -MINUTE],
    ['not a number', NaN],
    ['infinite', Infinity]
  ])('a timer whose planned time is %s is rejected', (_, plannedTime) => {
    expect(() => createTimer({ id: 'nap', name: 'Nap', kind: 'timer', plannedTime, appearance: { colour: 'teal' } })).toThrow('planned time')
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('a timer whose name is %s is rejected', (_, name) => {
    expect(() => createTimer({ id: 'nap', name, kind: 'timer', plannedTime: 20 * MINUTE, appearance: { colour: 'teal' } })).toThrow('name')
  })
})

describe('starting a timer', () => {
  test('a started timer is running and counts down from the moment it started', () => {
    const running = taskRunningSinceNine()

    expect(runStateAt(running, NINE + 10 * MINUTE)).toBe('running')
    expect(remainingTimeAt(running, NINE + 10 * MINUTE)).toBe(15 * MINUTE)
  })

  test('starting a running timer again changes nothing', () => {
    const running = taskRunningSinceNine()

    expect(start(running, NINE + 10 * MINUTE)).toEqual({ timer: running, ran: null })
  })

  test('starting a finished timer changes nothing', () => {
    const finished = finishedTask()

    expect(start(finished, NINE + HOUR)).toEqual({ timer: finished, ran: null })
  })

  test('a running timer will finish when its remaining time runs out', () => {
    const resumed = start(taskPausedAtTenPastNine(), NINE + HOUR).timer

    expect(finishesAt(resumed)).toBe(NINE + 75 * MINUTE)
  })

  test('a timer that is not running has no moment to finish at', () => {
    expect(finishesAt(newTask())).toBeNull()
  })
})

describe('pausing a timer', () => {
  test('a paused task keeps its remaining time', () => {
    const paused = taskPausedAtTenPastNine()

    expect(runStateAt(paused, NINE + HOUR)).toBe('paused')
    expect(remainingTimeAt(paused, NINE + HOUR)).toBe(15 * MINUTE)
  })

  test('pausing reports the span the timer ran since it started', () => {
    expect(pause(taskRunningSinceNine(), NINE + 10 * MINUTE).ran).toEqual({ from: NINE, to: NINE + 10 * MINUTE })
  })

  test('pausing a timer that is not running changes nothing', () => {
    const paused = taskPausedAtTenPastNine()

    expect(pause(paused, NINE + 20 * MINUTE)).toEqual({ timer: paused, ran: null })
  })

  test('pausing a timer that already ran out closes its span at the moment it finished', () => {
    expect(pause(taskRunningSinceNine(), NINE + 3 * HOUR).ran).toEqual({ from: NINE, to: NINE + 25 * MINUTE })
  })
})

describe('running out', () => {
  test('a timer that ran out while nobody looked is finished with no remaining time', () => {
    const running = taskRunningSinceNine()

    expect(runStateAt(running, NINE + 3 * HOUR)).toBe('finished')
    expect(remainingTimeAt(running, NINE + 3 * HOUR)).toBe(0)
  })

  test('a timer whose time runs out exactly now is finished', () => {
    expect(runStateAt(taskRunningSinceNine(), NINE + 25 * MINUTE)).toBe('finished')
  })

  test('settling a timer that ran out long ago closes its span at the moment it finished', () => {
    expect(settle(taskRunningSinceNine(), NINE + 3 * HOUR).ran).toEqual({ from: NINE, to: NINE + 25 * MINUTE })
  })

  test('settling a running timer that still has time changes nothing', () => {
    const running = taskRunningSinceNine()

    expect(settle(running, NINE + 10 * MINUTE)).toEqual({ timer: running, ran: null })
  })
})

describe('a clock that moved backwards', () => {
  test('a running timer does not gain time when now is before the moment it started running', () => {
    expect(remainingTimeAt(taskRunningSinceNine(), NINE - 10 * MINUTE)).toBe(25 * MINUTE)
  })

  test('pausing before the moment the timer started running reports no span and keeps its remaining time', () => {
    const { timer, ran } = pause(taskRunningSinceNine(), NINE - 10 * MINUTE)

    expect(ran).toBeNull()
    expect(remainingTimeAt(timer, NINE)).toBe(25 * MINUTE)
  })
})

describe('resetting a timer', () => {
  test('a reset timer is idle with all of its planned time again', () => {
    const again = reset(finishedTask(), NINE + HOUR).timer

    expect(runStateAt(again, NINE + HOUR)).toBe('idle')
    expect(remainingTimeAt(again, NINE + HOUR)).toBe(25 * MINUTE)
  })

  test('resetting a running timer reports the span it ran until the reset', () => {
    expect(reset(taskRunningSinceNine(), NINE + 10 * MINUTE).ran).toEqual({ from: NINE, to: NINE + 10 * MINUTE })
  })
})

describe('using up remaining time in a focus session', () => {
  test('a span of focus lowers a task\'s remaining time by its length and is reported as run, without the task running', () => {
    const { timer, ran } = useUp(newTask(), { from: NINE, to: NINE + 10 * MINUTE })

    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(15 * MINUTE)
    expect(runStateAt(timer, NINE + HOUR)).toBe('paused')
    expect(ran).toEqual({ from: NINE, to: NINE + 10 * MINUTE })
  })

  test('a span longer than what is left brings the task to zero, so it is finished, and only the time it had is reported as run', () => {
    const { timer, ran } = useUp(newTask(), { from: NINE, to: NINE + 40 * MINUTE })

    expect(runStateAt(timer, NINE + HOUR)).toBe('finished')
    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(0)
    expect(ran).toEqual({ from: NINE, to: NINE + 25 * MINUTE })
  })

  test('a finished task uses up nothing and reports no span', () => {
    const finished = useUp(newTask(), { from: NINE, to: NINE + 25 * MINUTE }).timer

    expect(useUp(finished, { from: NINE + HOUR, to: NINE + HOUR + 10 * MINUTE })).toEqual({ timer: finished, ran: null })
  })

  test('a span that ends before it starts uses up nothing', () => {
    const task = newTask()

    expect(useUp(task, { from: NINE, to: NINE - 10 * MINUTE })).toEqual({ timer: task, ran: null })
  })
})

describe('changing a timer', () => {
  const details = { name: 'Write the report', description: 'Chapters 3 to 5', plannedTime: 25 * MINUTE, appearance: { colour: 'violet' } } as const

  test('a paused timer takes the new name, description and appearance and keeps its remaining time and run state', () => {
    const { timer, ran } = withDetails(taskPausedAtTenPastNine(), details, NINE + HOUR)

    expect(timer).toMatchObject({ name: 'Write the report', description: 'Chapters 3 to 5', appearance: { colour: 'violet' } })
    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(15 * MINUTE)
    expect(runStateAt(timer, NINE + HOUR)).toBe('paused')
    expect(ran).toBeNull()
  })
  test('a changed timer rings with the ring sound it was given', () => {
    const { timer } = withDetails(newTask(), { ...details, ringSound: { kind: 'built-in', name: 'digital' } }, NINE)

    expect(timer.ringSound).toEqual({ kind: 'built-in', name: 'digital' })
  })
  test('a timer changed without a description has none', () => {
    const described = withDetails(newTask(), details, NINE).timer

    const { timer } = withDetails(described, { name: 'Write the report', plannedTime: 25 * MINUTE, appearance: { colour: 'violet' } }, NINE)

    expect(timer.description).toBeUndefined()
  })
  test('a paused timer keeps the time it has used, so a longer planned time adds to its remaining time', () => {
    const { timer } = withDetails(taskPausedAtTenPastNine(), { ...details, plannedTime: 40 * MINUTE }, NINE + HOUR)

    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(30 * MINUTE)
    expect(runStateAt(timer, NINE + HOUR)).toBe('paused')
  })
  test('a paused timer whose new planned time is no more than the time it has used is finished', () => {
    const { timer } = withDetails(taskPausedAtTenPastNine(), { ...details, plannedTime: 5 * MINUTE }, NINE + HOUR)

    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(0)
    expect(runStateAt(timer, NINE + HOUR)).toBe('finished')
  })
  test('a running timer keeps running with the time it has used so far, which is reported as run up to the change', () => {
    const { timer, ran } = withDetails(taskRunningSinceNine(), { ...details, plannedTime: 40 * MINUTE }, NINE + 10 * MINUTE)

    expect(runStateAt(timer, NINE + 10 * MINUTE)).toBe('running')
    expect(remainingTimeAt(timer, NINE + 20 * MINUTE)).toBe(20 * MINUTE)
    expect(finishesAt(timer)).toBe(NINE + 40 * MINUTE)
    expect(ran).toEqual({ from: NINE, to: NINE + 10 * MINUTE })
  })
  test('a running timer whose new planned time is no more than the time it has used is finished and stops running, so it never rings', () => {
    const { timer, ran } = withDetails(taskRunningSinceNine(), { ...details, plannedTime: 5 * MINUTE }, NINE + 10 * MINUTE)

    expect(runStateAt(timer, NINE + 10 * MINUTE)).toBe('finished')
    expect(finishesAt(timer)).toBeNull()
    expect(ran).toEqual({ from: NINE, to: NINE + 10 * MINUTE })
  })
  test('a finished timer stays finished with no remaining time, even with a longer planned time', () => {
    const { timer } = withDetails(finishedTask(), { ...details, plannedTime: 40 * MINUTE }, NINE + HOUR)

    expect(timer.plannedTime).toBe(40 * MINUTE)
    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(0)
    expect(runStateAt(timer, NINE + HOUR)).toBe('finished')
  })
  test('an idle timer gets all of its new planned time', () => {
    const { timer } = withDetails(newTask(), { ...details, plannedTime: 10 * MINUTE }, NINE)

    expect(remainingTimeAt(timer, NINE)).toBe(10 * MINUTE)
    expect(runStateAt(timer, NINE)).toBe('idle')
  })

  test.each([
    ['empty', { ...details, name: ' ' }, 'name'],
    ['zero', { ...details, plannedTime: 0 }, 'planned time']
  ])('a change to a name or planned time that is %s is rejected', (_, rejected, problem) => {
    expect(() => withDetails(newTask(), rejected, NINE)).toThrow(problem)
  })
})

describe('marking a task done by hand', () => {
  test('a task marked done is finished with no remaining time, and no span is reported since it did not run', () => {
    const { timer, ran } = markDone(taskPausedAtTenPastNine(), NINE + HOUR)

    expect(runStateAt(timer, NINE + HOUR)).toBe('finished')
    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(0)
    expect(ran).toBeNull()
  })

  test('a plain timer cannot be marked done, since only tasks are ever done', () => {
    const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })

    expect(() => markDone(tea, NINE)).toThrow('done')
  })

  test('marking a done task done again changes nothing, so it stays done from when it first was', () => {
    const done = finishedTask()

    expect(markDone(done, NINE + 2 * HOUR)).toEqual({ timer: done, ran: null })
  })
})

describe('undoing done', () => {
  test('a task marked done by hand gets back the remaining time it had, paused where it was', () => {
    const done = markDone(taskPausedAtTenPastNine(), NINE + HOUR).timer

    const { timer, ran } = undoDone(done)

    expect(remainingTimeAt(timer, NINE + 2 * HOUR)).toBe(15 * MINUTE)
    expect(runStateAt(timer, NINE + 2 * HOUR)).toBe('paused')
    expect(ran).toBeNull()
  })

  test('undoing done on a task that is not done changes nothing', () => {
    const paused = taskPausedAtTenPastNine()

    expect(undoDone(paused)).toEqual({ timer: paused, ran: null })
  })

  test('a task that ran out gets all of its planned time back', () => {
    const { timer } = undoDone(finishedTask())

    expect(remainingTimeAt(timer, NINE + HOUR)).toBe(25 * MINUTE)
    expect(runStateAt(timer, NINE + HOUR)).toBe('idle')
  })
})

describe('pinning a timer', () => {
  test('a new timer is not pinned', () => {
    expect(isPinned(newTask())).toBe(false)
  })

  test('a pinned timer is pinned and keeps running as it was, and unpinning it takes the pin away', () => {
    const { timer: pinned, ran } = pin(taskRunningSinceNine())

    expect(isPinned(pinned)).toBe(true)
    expect(runStateAt(pinned, NINE + 5 * MINUTE)).toBe('running')
    expect(remainingTimeAt(pinned, NINE + 5 * MINUTE)).toBe(20 * MINUTE)
    expect(ran).toBeNull()
    expect(isPinned(unpin(pinned).timer)).toBe(false)
  })

  test('changing a timer sets whether it is pinned', () => {
    const details = { name: 'Write report', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' } } as const

    const pinned = withDetails(newTask(), { ...details, pinned: true }, NINE).timer

    expect(isPinned(pinned)).toBe(true)
    expect(isPinned(withDetails(pinned, { ...details, pinned: false }, NINE).timer)).toBe(false)
  })

  test('a change that says nothing about the pin keeps the timer pinned', () => {
    const details = { name: 'Write report', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' } } as const

    const { timer } = withDetails(pin(newTask()).timer, details, NINE)

    expect(isPinned(timer)).toBe(true)
  })
})

describe('repeat days', () => {
  test('a repeating task with no repeat day is rejected', () => {
    expect(() => createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [] })).toThrow('repeat day')
  })

  test('a plain timer with repeat days is rejected, since timers do not repeat', () => {
    expect(() => createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' }, repeatDays: [1] })).toThrow('repeat')
  })
})

describe('a repeating task coming back', () => {
  const originalTimeZone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Europe/Warsaw'
  })

  afterAll(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTimeZone
    }
  })

  /** The moment the local clock shows the date and time, written as YYYY-MM-DDTHH:MM. */
  const at = (localTime: string) => new Date(localTime).getTime()

  function reading(repeatDays: NewTimer['repeatDays']) {
    return createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays })
  }

  test('a task repeating on Monday and Wednesday, done on Monday, is still done on Tuesday and back with all of its planned time on Wednesday', () => {
    const done = markDone(reading([1, 3]), at('2026-11-16T09:00')).timer

    const onTuesday = comeBack(done, at('2026-11-17T12:00'), localDayOf).timer
    const onWednesday = comeBack(done, at('2026-11-18T00:00'), localDayOf).timer

    expect(runStateAt(onTuesday, at('2026-11-17T12:00'))).toBe('finished')
    expect(runStateAt(onWednesday, at('2026-11-18T00:00'))).toBe('idle')
    expect(remainingTimeAt(onWednesday, at('2026-11-18T00:00'))).toBe(30 * MINUTE)
  })

  test('a task repeating on Monday and Tuesday that ran out late on Monday is done from that moment, not from when it was settled, so it is back on Tuesday', () => {
    const ranOut = settle(start(reading([1, 2]), at('2026-11-16T23:00')).timer, at('2026-11-17T08:00')).timer

    expect(runStateAt(comeBack(ranOut, at('2026-11-16T23:59'), localDayOf).timer, at('2026-11-16T23:59'))).toBe('finished')
    expect(runStateAt(comeBack(ranOut, at('2026-11-17T08:00'), localDayOf).timer, at('2026-11-17T08:00'))).toBe('idle')
  })

  test('a repeating task that ran out on Monday while nobody looked, and was never settled, is back on Wednesday', () => {
    const running = start(reading([1, 3]), at('2026-11-16T09:00')).timer

    const onWednesday = comeBack(running, at('2026-11-18T09:00'), localDayOf).timer

    expect(runStateAt(onWednesday, at('2026-11-18T09:00'))).toBe('idle')
    expect(remainingTimeAt(onWednesday, at('2026-11-18T09:00'))).toBe(30 * MINUTE)
  })

  test('a task repeating on Monday and Wednesday, paused unfinished on Monday, is still paused on Tuesday and back with all of its planned time on Wednesday', () => {
    const partly = pause(start(reading([1, 3]), at('2026-11-16T10:00')).timer, at('2026-11-16T10:10')).timer

    const onTuesday = comeBack(partly, at('2026-11-17T12:00'), localDayOf).timer
    const onWednesday = comeBack(partly, at('2026-11-18T00:00'), localDayOf).timer

    expect(remainingTimeAt(onTuesday, at('2026-11-17T12:00'))).toBe(20 * MINUTE)
    expect(runStateAt(onWednesday, at('2026-11-18T00:00'))).toBe('idle')
    expect(remainingTimeAt(onWednesday, at('2026-11-18T00:00'))).toBe(30 * MINUTE)
  })

  test('a task repeating on Monday and Wednesday, partly used in a focus session on Monday, is back with all of its planned time on Wednesday', () => {
    const partly = useUp(reading([1, 3]), { from: at('2026-11-16T10:00'), to: at('2026-11-16T10:10') }).timer

    expect(remainingTimeAt(comeBack(partly, at('2026-11-18T09:00'), localDayOf).timer, at('2026-11-18T09:00'))).toBe(30 * MINUTE)
  })

  test('a task repeating on Monday and Tuesday, left running from late on Monday, reports the span it ran up to now and is back idle with all of its planned time on Tuesday', () => {
    const running = start(reading([1, 2]), at('2026-11-16T23:50')).timer

    const back = comeBack(running, at('2026-11-17T00:10'), localDayOf)

    expect(back.ran).toEqual({ from: at('2026-11-16T23:50'), to: at('2026-11-17T00:10') })
    expect(runStateAt(back.timer, at('2026-11-17T00:10'))).toBe('idle')
    expect(remainingTimeAt(back.timer, at('2026-11-17T00:10'))).toBe(30 * MINUTE)
  })

  test('a repeating task brought to zero in a focus session late on Monday is done from that moment, so it is back on Tuesday', () => {
    const usedUp = useUp(reading([1, 2]), { from: at('2026-11-16T23:00'), to: at('2026-11-17T00:15') }).timer

    expect(runStateAt(comeBack(usedUp, at('2026-11-16T23:59'), localDayOf).timer, at('2026-11-16T23:59'))).toBe('finished')
    expect(runStateAt(comeBack(usedUp, at('2026-11-17T08:00'), localDayOf).timer, at('2026-11-17T08:00'))).toBe('idle')
  })

  test('a repeating task whose new planned time is already used up on Monday is done from that change, so it is back on Tuesday', () => {
    const partly = pause(start(reading([1, 2]), at('2026-11-16T22:00')).timer, at('2026-11-16T22:10')).timer
    const { timer: changed } = withDetails(partly, { name: 'Read', plannedTime: 5 * MINUTE, appearance: { colour: 'green' }, repeatDays: [1, 2] }, at('2026-11-16T23:00'))

    expect(runStateAt(comeBack(changed, at('2026-11-16T23:59'), localDayOf).timer, at('2026-11-16T23:59'))).toBe('finished')
    expect(remainingTimeAt(comeBack(changed, at('2026-11-17T08:00'), localDayOf).timer, at('2026-11-17T08:00'))).toBe(5 * MINUTE)
  })

  test('a done one-time task changed to repeat on Wednesday is back on Wednesday, and changed back to one-time it stays done', () => {
    const done = markDone(reading(undefined), at('2026-11-16T09:00')).timer
    const repeating = withDetails(done, { name: 'Read', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [3] }, at('2026-11-16T10:00')).timer
    const oneTime = withDetails(repeating, { name: 'Read', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } }, at('2026-11-16T11:00')).timer

    expect(runStateAt(comeBack(repeating, at('2026-11-18T09:00'), localDayOf).timer, at('2026-11-18T09:00'))).toBe('idle')
    expect(runStateAt(comeBack(oneTime, at('2026-11-18T09:00'), localDayOf).timer, at('2026-11-18T09:00'))).toBe('finished')
  })

  test('a one-time task stays done on every day after', () => {
    const done = markDone(reading(undefined), at('2026-11-16T09:00')).timer

    expect(runStateAt(comeBack(done, at('2026-12-16T09:00'), localDayOf).timer, at('2026-12-16T09:00'))).toBe('finished')
  })

  describe('what belongs on Today', () => {
    test('a one-time task that is not done belongs on Today on any day, and a timer too', () => {
      const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })

      expect(isForToday(reading(undefined), at('2026-11-17T09:00'), localDayOf)).toBe(true)
      expect(isForToday(tea, at('2026-11-17T09:00'), localDayOf)).toBe(true)
    })

    test('a repeating task belongs on Today on its repeat days only', () => {
      const mondaysAndWednesdays = reading([1, 3])

      expect(isForToday(mondaysAndWednesdays, at('2026-11-16T09:00'), localDayOf)).toBe(true)
      expect(isForToday(mondaysAndWednesdays, at('2026-11-17T09:00'), localDayOf)).toBe(false)
      expect(isForToday(mondaysAndWednesdays, at('2026-11-18T09:00'), localDayOf)).toBe(true)
    })

    test('a one-time task done today stays on Today, and from the next day on it no longer belongs there', () => {
      const done = markDone(reading(undefined), at('2026-11-16T09:00')).timer

      expect(isForToday(done, at('2026-11-16T23:59'), localDayOf)).toBe(true)
      expect(isForToday(done, at('2026-11-17T00:00'), localDayOf)).toBe(false)
    })
  })

  describe('across a week border', () => {
    test('a task repeating on Monday, done on Saturday, is still done on Sunday and back on Monday', () => {
      const done = markDone(reading([1]), at('2026-11-21T18:00')).timer

      expect(runStateAt(comeBack(done, at('2026-11-22T23:59'), localDayOf).timer, at('2026-11-22T23:59'))).toBe('finished')
      expect(runStateAt(comeBack(done, at('2026-11-23T00:00'), localDayOf).timer, at('2026-11-23T00:00'))).toBe('idle')
    })

    test('a task repeating only on Friday, done on Friday, is still done on Thursday and back on the next Friday', () => {
      const done = markDone(reading([5]), at('2026-11-20T09:00')).timer

      expect(runStateAt(comeBack(done, at('2026-11-26T23:59'), localDayOf).timer, at('2026-11-26T23:59'))).toBe('finished')
      expect(runStateAt(comeBack(done, at('2026-11-27T00:00'), localDayOf).timer, at('2026-11-27T00:00'))).toBe('idle')
    })

    test('a repeating task done two weeks ago, with several of its repeat days passed while the browser was closed, is back once with all of its planned time', () => {
      const done = markDone(pause(start(reading([1, 3, 5]), at('2026-11-16T09:00')).timer, at('2026-11-16T09:10')).timer, at('2026-11-16T09:10')).timer

      const back = comeBack(done, at('2026-11-30T12:00'), localDayOf).timer

      expect(remainingTimeAt(back, at('2026-11-30T12:00'))).toBe(30 * MINUTE)
      expect(runStateAt(back, at('2026-11-30T12:00'))).toBe('idle')
    })
  })

  describe('on the days the clocks change', () => {
    test('the day the clocks go forward is 23 hours long, and a task repeating on Monday is back at the first minute of Monday', () => {
      const done = markDone(reading([1]), at('2026-03-29T10:00')).timer

      expect(runStateAt(comeBack(done, at('2026-03-29T23:59'), localDayOf).timer, at('2026-03-29T23:59'))).toBe('finished')
      expect(runStateAt(comeBack(done, at('2026-03-30T00:01'), localDayOf).timer, at('2026-03-30T00:01'))).toBe('idle')
    })

    test('the day the clocks go back is 25 hours long, and a task repeating on Monday is still done in its last hour', () => {
      const done = markDone(reading([1]), at('2026-10-25T01:00')).timer

      expect(runStateAt(comeBack(done, at('2026-10-25T23:30'), localDayOf).timer, at('2026-10-25T23:30'))).toBe('finished')
      expect(runStateAt(comeBack(done, at('2026-10-26T00:01'), localDayOf).timer, at('2026-10-26T00:01'))).toBe('idle')
    })
  })
})
