import { addTaskSteps, createFocusSession, endEarly, fittedPlanOf, isCountingDownAt, isPinned, moveStep, pause, pin, progressAt, resume, sendToFront, settle, skip, start, taskTimesAt, unpin, upNextAt, withSettings, type NewFocusSession, type Progress } from './focus-session'
import type { TaskTime } from './plan'
import { createTimer, start as startTimer } from '../../timer/model/timer'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const report = { taskId: 'write-report', remainingTime: 60 * MINUTE }
const email = { taskId: 'answer-email', remainingTime: 30 * MINUTE }

function create(tasks: readonly TaskTime[], lengthsAndOrder: Pick<NewFocusSession, 'stepLength' | 'breakLength' | 'order'>) {
  return createFocusSession({ id: 'morning', name: 'Morning', taskIds: tasks.map(({ taskId }) => taskId), ...lengthsAndOrder }, tasks)
}

describe('creating a focus session', () => {
  test('a new session keeps the id, name, tasks and order it was given', () => {
    const session = createFocusSession(
      { id: 'morning', name: 'Morning', taskIds: ['write-report', 'answer-email'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'alternating' },
      [report, email]
    )

    expect(session).toMatchObject({ id: 'morning', name: 'Morning', taskIds: ['write-report', 'answer-email'], order: 'alternating' })
  })

  test('a task whose remaining time is not given stays among the tasks but gets no steps', () => {
    const session = createFocusSession(
      { id: 'morning', name: 'Morning', taskIds: ['water-plants', 'answer-email'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'alternating' },
      [email]
    )

    expect(session.taskIds).toEqual(['water-plants', 'answer-email'])
    expect(session.plan).toEqual([
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('a session whose name is %s is rejected', (_, name) => {
    expect(() => createFocusSession({ id: 'morning', name, taskIds: ['answer-email'], stepLength: 25 * MINUTE, breakLength: 0, order: 'one after another' }, [email]))
      .toThrow('name')
  })
})

describe('pinning a focus session', () => {
  test('a new session is not pinned', () => {
    expect(isPinned(create([report], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }))).toBe(false)
  })

  test('a pinned running session is pinned and keeps its run where it was, and unpinning it takes the pin away', () => {
    const running = start(create([report], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }), [report], 0).session

    const pinned = pin(running)

    expect(isPinned(pinned)).toBe(true)
    expect(progressAt(pinned, 10 * MINUTE)).toEqual(progressAt(running, 10 * MINUTE))
    expect(isPinned(unpin(pinned))).toBe(false)
  })

  test('changing the settings of a session sets whether it is pinned, and settings that say nothing about the pin keep it', () => {
    const settings = { name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' } as const
    const pinned = withSettings(create([report], settings), { ...settings, pinned: true }, [report])

    expect(isPinned(pinned)).toBe(true)
    expect(isPinned(withSettings(pinned, { ...settings, name: 'Early morning' }, [report]))).toBe(true)
    expect(isPinned(withSettings(pinned, { ...settings, pinned: false }, [report]))).toBe(false)
  })
})

describe('building a plan', () => {
  test('one after another, each task is cut into steps of the step length with a shorter last step', () => {
    const session = create([report, email], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' })

    expect(session.plan).toEqual([
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'write-report', length: 10 * MINUTE },
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test('alternating, the tasks take turns until each has run out', () => {
    const session = create([report, email], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'alternating' })

    expect(session.plan).toEqual([
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE },
      { taskId: 'write-report', length: 10 * MINUTE }
    ])
  })

  test('a task with no remaining time contributes no steps', () => {
    const done = { taskId: 'water-plants', remainingTime: 0 }
    const session = create([done, email], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'alternating' })

    expect(session.plan).toEqual([
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test.each([
    ['zero', 0],
    ['negative', -MINUTE],
    ['not a number', NaN],
    ['infinite', Infinity]
  ])('a step length that is %s is rejected', (_, stepLength) => {
    expect(() => create([email], { stepLength, breakLength: 5 * MINUTE, order: 'one after another' })).toThrow('step length')
  })

  test.each([
    ['negative', -MINUTE],
    ['not a number', NaN],
    ['infinite', Infinity]
  ])('a break length that is %s is rejected', (_, breakLength) => {
    expect(() => create([email], { stepLength: 25 * MINUTE, breakLength, order: 'one after another' })).toThrow('break length')
  })
})

const NINE = Date.UTC(2026, 10, 17, 9)

function reportThenEmail() {
  return create([report, email], { stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' })
}

function startedAtNine() {
  return start(reportThenEmail(), [report, email], NINE).session
}

function focusStepsOf(progress: Progress) {
  return progress.progressLine.parts.flatMap((part) => part.kind === 'focus step' ? [{ taskId: part.taskId, length: part.length }] : [])
}

describe('running a focus session', () => {
  test('a started session is in its first focus step and counts down from the moment it started', () => {
    expect(progressAt(startedAtNine(), NINE + 10 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 0, remainingTime: 15 * MINUTE })
  })

  test('when a focus step runs out the break starts, and when the break runs out the next focus step starts', () => {
    const running = startedAtNine()

    expect(progressAt(running, NINE + 27 * MINUTE)).toMatchObject({ state: 'break', currentStep: 0, remainingTime: 3 * MINUTE })
    expect(progressAt(running, NINE + 31 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 1, remainingTime: 24 * MINUTE })
  })

  test('gives the whole length of the focus step or break in progress, so the part that has run can be drawn', () => {
    const running = startedAtNine()

    expect(progressAt(running, NINE + 10 * MINUTE).partLength).toBe(25 * MINUTE)
    expect(progressAt(running, NINE + 27 * MINUTE).partLength).toBe(5 * MINUTE)
    expect(progressAt(running, NINE + 65 * MINUTE).partLength).toBe(10 * MINUTE)
    expect(progressAt(pause(running, NINE + 27 * MINUTE).session, NINE + HOUR).partLength).toBe(5 * MINUTE)
    expect(progressAt(reportThenEmail(), NINE).partLength).toBeNull()
    expect(progressAt(running, NINE + 3 * HOUR).partLength).toBeNull()
  })

  test('a session that has not started is idle with its saved plan on the progress line, nothing filled and no estimated end', () => {
    const progress = progressAt(reportThenEmail(), NINE)

    expect(progress).toMatchObject({ state: 'idle', currentStep: null, remainingTime: null, estimatedEnd: null, delay: 0 })
    expect(focusStepsOf(progress)).toEqual(reportThenEmail().plan)
    expect(progress.progressLine.filled).toBe(0)
  })

  test('a session whose last focus step has run out is finished', () => {
    expect(progressAt(startedAtNine(), NINE + 110 * MINUTE)).toMatchObject({ state: 'finished', currentStep: null, remainingTime: null })
  })

  test('a session that finished while nobody looked shows the moment it ended and a full progress line', () => {
    const progress = progressAt(startedAtNine(), NINE + 3 * HOUR)

    expect(progress.estimatedEnd).toBe(NINE + 110 * MINUTE)
    expect(progress.progressLine.filled).toBe(110 * MINUTE)
  })

  test('a session that runs without pauses ends when all its focus steps and the breaks between them have run, with no delay', () => {
    expect(progressAt(startedAtNine(), NINE + 10 * MINUTE)).toMatchObject({ estimatedEnd: NINE + 110 * MINUTE, delay: 0 })
  })

  test('the progress line holds every focus step and the breaks between them in order, filled up to now', () => {
    expect(progressAt(startedAtNine(), NINE + 40 * MINUTE).progressLine).toEqual({
      parts: [
        { kind: 'focus step', taskId: 'write-report', length: 25 * MINUTE },
        { kind: 'break', length: 5 * MINUTE },
        { kind: 'focus step', taskId: 'write-report', length: 25 * MINUTE },
        { kind: 'break', length: 5 * MINUTE },
        { kind: 'focus step', taskId: 'write-report', length: 10 * MINUTE },
        { kind: 'break', length: 5 * MINUTE },
        { kind: 'focus step', taskId: 'answer-email', length: 25 * MINUTE },
        { kind: 'break', length: 5 * MINUTE },
        { kind: 'focus step', taskId: 'answer-email', length: 5 * MINUTE }
      ],
      filled: 40 * MINUTE
    })
  })
})

describe('what the stored tasks have left', () => {
  test('is the remaining time of each task at the moment, and leaves out timers that are not tasks', () => {
    const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: HOUR, appearance: { colour: 'blue' } })
    const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })
    const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })

    expect(taskTimesAt([startTimer(writeReport, NINE).timer, tea, answerEmail], NINE + 10 * MINUTE)).toEqual([
      { taskId: 'write-report', remainingTime: 50 * MINUTE },
      { taskId: 'answer-email', remainingTime: 30 * MINUTE }
    ])
  })
  test('of the tasks named is the remaining time of each in the order named, or nothing when one of them is not a stored task', () => {
    const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: HOUR, appearance: { colour: 'blue' } })
    const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })
    const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })

    expect(taskTimesAt([writeReport, tea, answerEmail], NINE, ['answer-email', 'write-report'])).toEqual([
      { taskId: 'answer-email', remainingTime: 30 * MINUTE },
      { taskId: 'write-report', remainingTime: HOUR }
    ])
    expect(taskTimesAt([writeReport, tea], NINE, ['write-report', 'tea'])).toBeNull()
  })
})

describe('what starting a focus session would run', () => {
  test('is the saved plan fitted to what each task has left, with how long it takes with its breaks and a progress line with nothing filled', () => {
    const reportPartlyDone = { taskId: 'write-report', remainingTime: 40 * MINUTE }

    expect(fittedPlanOf(reportThenEmail(), [reportPartlyDone, email])).toEqual({
      focusSteps: 4,
      length: 85 * MINUTE,
      progressLine: {
        parts: [
          { kind: 'focus step', taskId: 'write-report', length: 25 * MINUTE },
          { kind: 'break', length: 5 * MINUTE },
          { kind: 'focus step', taskId: 'write-report', length: 15 * MINUTE },
          { kind: 'break', length: 5 * MINUTE },
          { kind: 'focus step', taskId: 'answer-email', length: 25 * MINUTE },
          { kind: 'break', length: 5 * MINUTE },
          { kind: 'focus step', taskId: 'answer-email', length: 5 * MINUTE }
        ],
        filled: 0
      }
    })
  })

  test('is empty when the tasks have nothing left', () => {
    expect(fittedPlanOf(reportThenEmail(), [])).toEqual({ focusSteps: 0, length: 0, progressLine: { parts: [], filled: 0 } })
  })
})

describe('starting a focus session', () => {
  test('the saved plan keeps its order but gives no task more time than it has left, and empty steps disappear', () => {
    const reportHalfDone = { taskId: 'write-report', remainingTime: 40 * MINUTE }
    const running = start(reportThenEmail(), [reportHalfDone, email], NINE).session

    expect(focusStepsOf(progressAt(running, NINE))).toEqual([
      { taskId: 'write-report', length: 25 * MINUTE },
      { taskId: 'write-report', length: 15 * MINUTE },
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test('a task whose remaining time is not given has nothing left, so its steps disappear', () => {
    const running = start(reportThenEmail(), [email], NINE).session

    expect(focusStepsOf(progressAt(running, NINE))).toEqual([
      { taskId: 'answer-email', length: 25 * MINUTE },
      { taskId: 'answer-email', length: 5 * MINUTE }
    ])
  })

  test('a session whose tasks have nothing left does not start', () => {
    const saved = reportThenEmail()
    const { session } = start(saved, [{ taskId: 'write-report', remainingTime: 0 }], NINE)

    expect(session).toEqual(saved)
    expect(progressAt(session, NINE).state).toBe('idle')
  })

  test('starting a session that finished while nobody looked reports how it ended and starts it again', () => {
    const { session, endings } = start(startedAtNine(), [report, email], NINE + 3 * HOUR)

    expect(endings.at(-1)).toEqual({ of: 'session', at: NINE + 110 * MINUTE })
    expect(progressAt(session, NINE + 3 * HOUR)).toMatchObject({ state: 'focus step', currentStep: 0, remainingTime: 25 * MINUTE })
  })

  test('starting a running session again changes nothing', () => {
    const running = startedAtNine()

    expect(start(running, [report, email], NINE + 10 * MINUTE)).toEqual(settle(running, NINE + 10 * MINUTE))
  })
})

function pausedAtTenPastNine() {
  return pause(startedAtNine(), NINE + 10 * MINUTE).session
}

describe('pausing and resuming', () => {
  test('a session counts down in a focus step and in a break, and not while it is paused, before it starts or once it has finished', () => {
    const running = startedAtNine()

    expect([NINE + 10 * MINUTE, NINE + 27 * MINUTE, NINE + 2 * HOUR].map((now) => isCountingDownAt(running, now))).toEqual([true, true, false])
    expect(isCountingDownAt(pausedAtTenPastNine(), NINE + 11 * MINUTE)).toBe(false)
    expect(isCountingDownAt(reportThenEmail(), NINE)).toBe(false)
  })

  test('a paused session keeps what is left of its focus step, and the time it stays paused is the delay that moves its estimated end later', () => {
    expect(progressAt(pausedAtTenPastNine(), NINE + 40 * MINUTE)).toMatchObject({
      state: 'paused',
      currentStep: 0,
      remainingTime: 15 * MINUTE,
      delay: 30 * MINUTE,
      estimatedEnd: NINE + 140 * MINUTE
    })
  })

  test('a resumed session counts down again from where it paused and keeps the delay it gathered', () => {
    const resumed = resume(pausedAtTenPastNine(), NINE + 40 * MINUTE).session

    expect(progressAt(resumed, NINE + 45 * MINUTE)).toMatchObject({
      state: 'focus step',
      currentStep: 0,
      remainingTime: 10 * MINUTE,
      delay: 30 * MINUTE,
      estimatedEnd: NINE + 140 * MINUTE
    })
  })

  test('resuming a session that is not paused changes nothing', () => {
    const running = startedAtNine()

    expect(resume(running, NINE + 10 * MINUTE)).toEqual(settle(running, NINE + 10 * MINUTE))
  })

  test('pausing a paused session again changes nothing', () => {
    const paused = pausedAtTenPastNine()

    expect(pause(paused, NINE + 40 * MINUTE).session).toEqual(paused)
  })

  test('pausing during a break holds the break, and resuming goes on with what is left of it', () => {
    const pausedInBreak = pause(startedAtNine(), NINE + 27 * MINUTE).session
    const resumed = resume(pausedInBreak, NINE + HOUR).session

    expect(progressAt(pausedInBreak, NINE + HOUR)).toMatchObject({ state: 'paused', currentStep: 0, remainingTime: 3 * MINUTE })
    expect(progressAt(resumed, NINE + HOUR + 2 * MINUTE)).toMatchObject({ state: 'break', currentStep: 0, remainingTime: MINUTE })
  })

  test('a paused session tells whether it was paused in a focus step or in a break', () => {
    const pausedInBreak = pause(startedAtNine(), NINE + 27 * MINUTE).session

    expect(progressAt(pausedAtTenPastNine(), NINE + HOUR)).toMatchObject({ state: 'paused', pausedIn: 'focus step' })
    expect(progressAt(pausedInBreak, NINE + HOUR)).toMatchObject({ state: 'paused', pausedIn: 'break' })
  })

  test('pausing reports the span the task of the current focus step was in focus', () => {
    expect(pause(startedAtNine(), NINE + 10 * MINUTE).focus).toEqual([{ taskId: 'write-report', span: { from: NINE, to: NINE + 10 * MINUTE } }])
  })
})

describe('settling a session nobody looked at', () => {
  test('settling long after the end reports the span of every focus step at the moments it ran', () => {
    expect(settle(startedAtNine(), NINE + 3 * HOUR).focus).toEqual([
      { taskId: 'write-report', span: { from: NINE, to: NINE + 25 * MINUTE } },
      { taskId: 'write-report', span: { from: NINE + 30 * MINUTE, to: NINE + 55 * MINUTE } },
      { taskId: 'write-report', span: { from: NINE + 60 * MINUTE, to: NINE + 70 * MINUTE } },
      { taskId: 'answer-email', span: { from: NINE + 75 * MINUTE, to: NINE + 100 * MINUTE } },
      { taskId: 'answer-email', span: { from: NINE + 105 * MINUTE, to: NINE + 110 * MINUTE } }
    ])
  })

  test('settling long after the end reports every focus step and break that ended and then the session, in order', () => {
    expect(settle(startedAtNine(), NINE + 3 * HOUR).endings).toEqual([
      { of: 'focus step', at: NINE + 25 * MINUTE },
      { of: 'break', at: NINE + 30 * MINUTE },
      { of: 'focus step', at: NINE + 55 * MINUTE },
      { of: 'break', at: NINE + 60 * MINUTE },
      { of: 'focus step', at: NINE + 70 * MINUTE },
      { of: 'break', at: NINE + 75 * MINUTE },
      { of: 'focus step', at: NINE + 100 * MINUTE },
      { of: 'break', at: NINE + 105 * MINUTE },
      { of: 'session', at: NINE + 110 * MINUTE }
    ])
  })

  test('a session settled after its end is idle again with its saved plan as it was', () => {
    const halfDone = start(reportThenEmail(), [{ taskId: 'write-report', remainingTime: 40 * MINUTE }, email], NINE).session
    const { session } = settle(halfDone, NINE + 3 * HOUR)

    expect(session).toEqual(reportThenEmail())
  })

  test('settling again at the same moment reports nothing, and a later settle reports only what came after', () => {
    const first = settle(startedAtNine(), NINE + 40 * MINUTE)
    const again = settle(first.session, NINE + 40 * MINUTE)
    const later = settle(again.session, NINE + 58 * MINUTE)

    expect(first.focus).toEqual([
      { taskId: 'write-report', span: { from: NINE, to: NINE + 25 * MINUTE } },
      { taskId: 'write-report', span: { from: NINE + 30 * MINUTE, to: NINE + 40 * MINUTE } }
    ])
    expect(again).toEqual({ session: first.session, focus: [], endings: [] })
    expect(later.focus).toEqual([{ taskId: 'write-report', span: { from: NINE + 40 * MINUTE, to: NINE + 55 * MINUTE } }])
    expect(later.endings).toEqual([{ of: 'focus step', at: NINE + 55 * MINUTE }])
  })

  test('settling at the moment a focus step ends reports its end once, however often it is settled again', () => {
    const atEnd = settle(startedAtNine(), NINE + 25 * MINUTE)
    const again = settle(atEnd.session, NINE + 25 * MINUTE)
    const later = settle(again.session, NINE + 27 * MINUTE)

    expect(atEnd.endings).toEqual([{ of: 'focus step', at: NINE + 25 * MINUTE }])
    expect(again.endings).toEqual([])
    expect(later.endings).toEqual([])
  })

  test('a pause that began before its focus step would have ended stays in that step however long after it is looked at', () => {
    const paused = pausedAtTenPastNine()

    expect(progressAt(paused, NINE + 4 * HOUR)).toMatchObject({ state: 'paused', currentStep: 0, remainingTime: 15 * MINUTE, delay: 4 * HOUR - 10 * MINUTE })
    expect(settle(paused, NINE + 4 * HOUR)).toEqual({ session: paused, focus: [], endings: [] })
  })
})

describe('skipping a break', () => {
  test('skipping ends the break at once, so the next focus step starts and the estimated end comes earlier', () => {
    const { session, endings } = skip(startedAtNine(), NINE + 27 * MINUTE)

    expect(endings).toEqual([{ of: 'focus step', at: NINE + 25 * MINUTE }, { of: 'break', at: NINE + 27 * MINUTE }])
    expect(progressAt(session, NINE + 27 * MINUTE)).toMatchObject({
      state: 'focus step',
      currentStep: 1,
      remainingTime: 25 * MINUTE,
      estimatedEnd: NINE + 107 * MINUTE
    })
  })

  test('skipping during a focus step changes nothing', () => {
    const running = startedAtNine()

    expect(skip(running, NINE + 10 * MINUTE)).toEqual(settle(running, NINE + 10 * MINUTE))
  })

  test('skipping a paused break changes nothing, since the session is paused rather than in its break', () => {
    const pausedInBreak = pause(startedAtNine(), NINE + 27 * MINUTE).session

    expect(skip(pausedInBreak, NINE + 28 * MINUTE)).toEqual({ session: pausedInBreak, focus: [], endings: [] })
  })
})

describe('ending early', () => {
  test('ending early reports the focus up to now and the end of the session, and leaves it idle with its saved plan', () => {
    expect(endEarly(startedAtNine(), NINE + 10 * MINUTE)).toEqual({
      session: reportThenEmail(),
      focus: [{ taskId: 'write-report', span: { from: NINE, to: NINE + 10 * MINUTE } }],
      endings: [{ of: 'session', at: NINE + 10 * MINUTE }]
    })
  })

  test('ending a paused session early reports no further focus and ends it now', () => {
    expect(endEarly(pausedAtTenPastNine(), NINE + 40 * MINUTE)).toEqual({
      session: reportThenEmail(),
      focus: [],
      endings: [{ of: 'session', at: NINE + 40 * MINUTE }]
    })
  })
})

describe('a clock that moved backwards', () => {
  test('resuming at a moment before the pause does not count the same moments twice', () => {
    const resumed = resume(pausedAtTenPastNine(), NINE).session

    expect(settle(resumed, NINE + 20 * MINUTE).focus).toEqual([{ taskId: 'write-report', span: { from: NINE + 10 * MINUTE, to: NINE + 20 * MINUTE } }])
  })

  test('looking before the moment the session started shows no time gone and no delay', () => {
    expect(progressAt(startedAtNine(), NINE - 10 * MINUTE)).toMatchObject({ remainingTime: 25 * MINUTE, estimatedEnd: NINE + 110 * MINUTE, delay: 0 })
    expect(progressAt(pausedAtTenPastNine(), NINE)).toMatchObject({ remainingTime: 15 * MINUTE, delay: 0 })
  })

  test('pausing or settling before the moment the session started reports nothing and keeps all its time', () => {
    const pausedEarly = pause(startedAtNine(), NINE - 10 * MINUTE)

    expect(pausedEarly.focus).toEqual([])
    expect(progressAt(pausedEarly.session, NINE)).toMatchObject({ state: 'paused', remainingTime: 25 * MINUTE })
    expect(settle(startedAtNine(), NINE - 10 * MINUTE)).toEqual({ session: startedAtNine(), focus: [], endings: [] })
  })
})

describe('a break length of zero', () => {
  test('means no breaks, so each focus step starts as the one before it ends', () => {
    const noBreaks = create([report], { stepLength: 25 * MINUTE, breakLength: 0, order: 'one after another' })
    const running = start(noBreaks, [report], NINE).session

    expect(progressAt(running, NINE).progressLine.parts.map(({ kind }) => kind)).toEqual(['focus step', 'focus step', 'focus step'])
    expect(settle(running, NINE + 3 * HOUR).endings).toEqual([
      { of: 'focus step', at: NINE + 25 * MINUTE },
      { of: 'focus step', at: NINE + 50 * MINUTE },
      { of: 'session', at: NINE + 60 * MINUTE }
    ])
  })
})

const reportStep = { taskId: 'write-report', length: 25 * MINUTE }
const reportLastStep = { taskId: 'write-report', length: 10 * MINUTE }
const emailStep = { taskId: 'answer-email', length: 25 * MINUTE }
const emailLastStep = { taskId: 'answer-email', length: 5 * MINUTE }
const desk = { taskId: 'tidy-desk', remainingTime: 30 * MINUTE }
const deskStep = { taskId: 'tidy-desk', length: 25 * MINUTE }
const deskLastStep = { taskId: 'tidy-desk', length: 5 * MINUTE }

describe('changing a saved plan', () => {
  test('a task added in the settings gets its steps of the step length at the end of the saved plan and becomes one of the tasks of the session', () => {
    const changed = withSettings(reportThenEmail(), { ...reportThenEmail(), taskIds: ['write-report', 'answer-email', 'tidy-desk'] }, [report, email, desk])

    expect(changed.taskIds).toEqual(['write-report', 'answer-email', 'tidy-desk'])
    expect(changed.plan).toEqual([reportStep, reportStep, reportLastStep, emailStep, emailLastStep, deskStep, deskLastStep])
  })

  test('a new order in the settings arranges the saved plan again', () => {
    const changed = withSettings(reportThenEmail(), { ...reportThenEmail(), order: 'alternating' }, [report, email])

    expect(changed.plan).toEqual([reportStep, emailStep, reportStep, emailLastStep, reportLastStep])
  })

  test('up next changes leave an idle session and its saved plan as they were, since only a run has up next', () => {
    const saved = reportThenEmail()

    expect(moveStep(saved, 3, 0, NINE)).toEqual(saved)
    expect(sendToFront(saved, 3, NINE)).toEqual(saved)
    expect(addTaskSteps(saved, desk, NINE)).toEqual(saved)
  })
})

describe('up next', () => {
  test('holds the steps of the run after the current step, each with its place in the plan, also while a break or a pause is on', () => {
    const running = startedAtNine()
    const afterFirstStep = [
      { step: 1, taskId: 'write-report', length: 25 * MINUTE },
      { step: 2, taskId: 'write-report', length: 10 * MINUTE },
      { step: 3, taskId: 'answer-email', length: 25 * MINUTE },
      { step: 4, taskId: 'answer-email', length: 5 * MINUTE }
    ]

    expect(upNextAt(running, NINE + 10 * MINUTE)).toEqual(afterFirstStep)
    expect(upNextAt(running, NINE + 27 * MINUTE)).toEqual(afterFirstStep)
    expect(upNextAt(pause(running, NINE + 27 * MINUTE).session, NINE + HOUR)).toEqual(afterFirstStep)
    expect(upNextAt(running, NINE + 31 * MINUTE)).toEqual(afterFirstStep.slice(1))
  })

  test('is empty while the session is idle or after its last focus step has started', () => {
    const running = startedAtNine()

    expect(upNextAt(reportThenEmail(), NINE)).toEqual([])
    expect(upNextAt(running, NINE + 106 * MINUTE)).toEqual([])
    expect(upNextAt(running, NINE + 3 * HOUR)).toEqual([])
  })
})

describe('changing up next in a running session', () => {
  test('moving a step changes what this run does next and leaves the saved plan as it was', () => {
    const moved = moveStep(startedAtNine(), 3, 1, NINE + 10 * MINUTE)

    expect(focusStepsOf(progressAt(moved, NINE + 10 * MINUTE))).toEqual([reportStep, emailStep, reportStep, reportLastStep, emailLastStep])
    expect(moved.plan).toEqual(reportThenEmail().plan)
  })

  test.each([
    ['a finished step', 0, 3],
    ['the step in progress', 1, 3],
    ['a step to the place of the step in progress', 3, 1],
    ['a step before the step in progress', 3, 0]
  ])('moving %s changes nothing', (_, from, to) => {
    const running = startedAtNine()

    expect(moveStep(running, from, to, NINE + 40 * MINUTE)).toEqual(running)
  })

  test.each([
    ['a step after the last', 5, 1],
    ['a step to a place after the last', 1, 5],
    ['a negative step', -1, 1],
    ['a step to a negative place', 1, -1]
  ])('moving %s changes nothing', (_, from, to) => {
    const running = startedAtNine()

    expect(moveStep(running, from, to, NINE + 10 * MINUTE)).toEqual(running)
  })

  test('during a break the focus step after it has not started, so it can still move', () => {
    const moved = moveStep(startedAtNine(), 3, 1, NINE + 27 * MINUTE)

    expect(focusStepsOf(progressAt(moved, NINE + 27 * MINUTE))).toEqual([reportStep, emailStep, reportStep, reportLastStep, emailLastStep])
  })

  test('a session that finished while nobody looked has nothing left to move', () => {
    const running = startedAtNine()

    expect(moveStep(running, 3, 4, NINE + 3 * HOUR)).toEqual(running)
  })

  test('sending a step to the front makes it the next focus step after the one in progress', () => {
    const sent = sendToFront(startedAtNine(), 4, NINE + 10 * MINUTE)

    expect(focusStepsOf(progressAt(sent, NINE + 10 * MINUTE))).toEqual([reportStep, emailLastStep, reportStep, reportLastStep, emailStep])
  })
})

describe('adding a task', () => {
  test('a task added to a run gets its steps of the step length at the end of this run, and does not become one of the tasks of the session', () => {
    const added = addTaskSteps(startedAtNine(), desk, NINE + 10 * MINUTE)

    expect(added.run?.plan).toEqual([reportStep, reportStep, reportLastStep, emailStep, emailLastStep, deskStep, deskLastStep])
    expect(added.plan).toEqual(reportThenEmail().plan)
    expect(added.taskIds).toEqual(['write-report', 'answer-email'])
  })

  test('a task added while the last focus step runs gets a break before its steps, and the estimated end moves later', () => {
    const added = addTaskSteps(startedAtNine(), desk, NINE + 107 * MINUTE)

    expect(progressAt(added, NINE + 107 * MINUTE)).toMatchObject({ state: 'focus step', currentStep: 4, remainingTime: 3 * MINUTE, estimatedEnd: NINE + 150 * MINUTE })
    expect(progressAt(added, NINE + 107 * MINUTE).progressLine.parts.slice(-4)).toEqual([
      { kind: 'break', length: 5 * MINUTE },
      { kind: 'focus step', ...deskStep },
      { kind: 'break', length: 5 * MINUTE },
      { kind: 'focus step', ...deskLastStep }
    ])
  })

  test('a task that already has steps in the run is not added again', () => {
    const running = startedAtNine()

    expect(addTaskSteps(running, email, NINE + 10 * MINUTE)).toEqual(running)
  })
})
