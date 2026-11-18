import type { DayOf } from '@/utils/time/calendar'
import { recordSpan } from './tracked-time'
import { dayProgressOf, earliestTrackedDay, isAvailable, monthAfter, weekAfter, weekBefore, monthBefore, MONDAY, monthOf, filterChoicesOf, narrowedTo, repeatDaysIn, totalsFor, weekOf } from './statistics'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const tasks = [
  { id: 'write-report', name: 'Write the report' },
  { id: 'read-mail', name: 'Read mail' },
  { id: 'practise-piano', name: 'Practise piano' }
]

describe('totals for a range of days', () => {
  test('each day of the range has the tracked time of all tasks on it, and a day with nothing has zero', () => {
    const tracked = {
      'write-report': { '2026-11-16': 25 * MINUTE, '2026-11-18': 40 * MINUTE },
      'read-mail': { '2026-11-16': 10 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-18' }, tasks).days.map(({ day, tracked }) => ({ day, tracked }))).toEqual([
      { day: '2026-11-16', tracked: 35 * MINUTE },
      { day: '2026-11-17', tracked: 0 },
      { day: '2026-11-18', tracked: 40 * MINUTE }
    ])
  })

  test('each task tracked in the range has its tracked time over the whole range, named from the tasks', () => {
    const tracked = {
      'write-report': { '2026-11-15': 5 * MINUTE, '2026-11-16': 25 * MINUTE, '2026-11-18': 40 * MINUTE },
      'read-mail': { '2026-11-17': 10 * MINUTE },
      'practise-piano': { '2026-11-19': 30 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-18' }, tasks).tasks).toEqual([
      { taskId: 'write-report', name: 'Write the report', tracked: 65 * MINUTE },
      { taskId: 'read-mail', name: 'Read mail', tracked: 10 * MINUTE }
    ])
  })

  test('the range has the tracked time of all tasks on all of its days', () => {
    const tracked = {
      'write-report': { '2026-11-15': 5 * MINUTE, '2026-11-16': 25 * MINUTE, '2026-11-18': 40 * MINUTE },
      'read-mail': { '2026-11-17': 10 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-18' }, tasks).tracked).toBe(75 * MINUTE)
  })

  test('each day of the range has the tracked time of each task on it, and a day with nothing has no tasks', () => {
    const tracked = {
      'write-report': { '2026-11-16': 25 * MINUTE },
      'read-mail': { '2026-11-16': 10 * MINUTE, '2026-11-18': 15 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-18' }, tasks).days.map((day) => day.tasks)).toEqual([
      [
        { taskId: 'write-report', name: 'Write the report', tracked: 25 * MINUTE },
        { taskId: 'read-mail', name: 'Read mail', tracked: 10 * MINUTE }
      ],
      [],
      [{ taskId: 'read-mail', name: 'Read mail', tracked: 15 * MINUTE }]
    ])
  })
})

describe('totals at the edges of the history', () => {
  test('an empty history gives every day of the range zero and no tasks', () => {
    const totals = totalsFor({}, { first: '2026-11-16', last: '2026-11-17' }, tasks)

    expect(totals).toEqual({
      days: [
        { day: '2026-11-16', tracked: 0, tasks: [] },
        { day: '2026-11-17', tracked: 0, tasks: [] }
      ],
      tasks: [],
      tracked: 0
    })
  })

  test('a range before any tracked time has nothing in it', () => {
    const tracked = { 'write-report': { '2026-11-16': 25 * MINUTE } }

    const totals = totalsFor(tracked, { first: '2026-11-02', last: '2026-11-08' }, tasks)

    expect(totals.tracked).toBe(0)
    expect(totals.tasks).toEqual([])
  })

  test('a span recorded across midnight counts once in the totals of both days together', () => {
    const dayOf: DayOf = (moment) => (moment < 24 * HOUR ? { day: '2026-11-16', endsAt: 24 * HOUR } : { day: '2026-11-17', endsAt: 48 * HOUR })
    const tracked = recordSpan({}, 'write-report', { from: 23 * HOUR + 40 * MINUTE, to: 24 * HOUR + 15 * MINUTE }, dayOf)

    const totals = totalsFor(tracked, { first: '2026-11-16', last: '2026-11-17' }, tasks)

    expect(totals.days.map((day) => day.tracked)).toEqual([20 * MINUTE, 15 * MINUTE])
    expect(totals.tasks).toEqual([{ taskId: 'write-report', name: 'Write the report', tracked: 35 * MINUTE }])
    expect(totals.tracked).toBe(35 * MINUTE)
  })
})

describe('the order of tasks in totals', () => {
  test('the task with the most tracked time comes first', () => {
    const tracked = {
      'read-mail': { '2026-11-16': 10 * MINUTE },
      'practise-piano': { '2026-11-16': 30 * MINUTE },
      'write-report': { '2026-11-16': 20 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-16' }, tasks).tasks.map((task) => task.taskId)).toEqual(['practise-piano', 'write-report', 'read-mail'])
  })

  test('tasks with the same tracked time keep the order of the tasks', () => {
    const tracked = {
      'practise-piano': { '2026-11-16': 20 * MINUTE },
      'read-mail': { '2026-11-16': 20 * MINUTE },
      'write-report': { '2026-11-16': 20 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-16' }, tasks).tasks.map((task) => task.taskId)).toEqual(['write-report', 'read-mail', 'practise-piano'])
  })
})

describe('removed tasks in totals', () => {
  test('the tracked time of a removed task is kept and the task has no name', () => {
    const tracked = {
      'write-report': { '2026-11-16': 20 * MINUTE },
      'old-project': { '2026-11-16': 30 * MINUTE }
    }

    const totals = totalsFor(tracked, { first: '2026-11-16', last: '2026-11-16' }, tasks)

    expect(totals.tasks).toEqual([
      { taskId: 'old-project', name: null, tracked: 30 * MINUTE },
      { taskId: 'write-report', name: 'Write the report', tracked: 20 * MINUTE }
    ])
    expect(totals.tracked).toBe(50 * MINUTE)
  })

  test('removed tasks come after the tasks that still exist when their tracked time is the same, ordered by id among themselves', () => {
    const tracked = {
      'old-project': { '2026-11-16': 20 * MINUTE },
      'archived-chores': { '2026-11-16': 20 * MINUTE },
      'read-mail': { '2026-11-16': 20 * MINUTE }
    }

    expect(totalsFor(tracked, { first: '2026-11-16', last: '2026-11-16' }, tasks).tasks.map((task) => task.taskId)).toEqual(['read-mail', 'archived-chores', 'old-project'])
  })
})

describe('the week containing a day', () => {
  test('a week starting on Monday runs from the Monday before a Wednesday to the Sunday after it', () => {
    expect(weekOf('2026-11-18', MONDAY)).toEqual({ first: '2026-11-16', last: '2026-11-22' })
  })

  test('a Monday starts its own week', () => {
    expect(weekOf('2026-11-16', MONDAY)).toEqual({ first: '2026-11-16', last: '2026-11-22' })
  })

  test('a Sunday ends the week that started on the Monday before it', () => {
    expect(weekOf('2026-11-22', MONDAY)).toEqual({ first: '2026-11-16', last: '2026-11-22' })
  })

  test('a week can start on another day, here on Sunday', () => {
    expect(weekOf('2026-11-18', 0)).toEqual({ first: '2026-11-15', last: '2026-11-21' })
  })

  test('a week across a month border has seven days in order, each with its total and its tasks, empty days included', () => {
    const tracked = {
      'write-report': { '2026-11-30': 25 * MINUTE, '2026-12-02': 40 * MINUTE },
      'read-mail': { '2026-12-02': 10 * MINUTE }
    }

    expect(totalsFor(tracked, weekOf('2026-12-03', MONDAY), tasks).days).toEqual([
      { day: '2026-11-30', tracked: 25 * MINUTE, tasks: [{ taskId: 'write-report', name: 'Write the report', tracked: 25 * MINUTE }] },
      { day: '2026-12-01', tracked: 0, tasks: [] },
      {
        day: '2026-12-02',
        tracked: 50 * MINUTE,
        tasks: [
          { taskId: 'write-report', name: 'Write the report', tracked: 40 * MINUTE },
          { taskId: 'read-mail', name: 'Read mail', tracked: 10 * MINUTE }
        ]
      },
      { day: '2026-12-03', tracked: 0, tasks: [] },
      { day: '2026-12-04', tracked: 0, tasks: [] },
      { day: '2026-12-05', tracked: 0, tasks: [] },
      { day: '2026-12-06', tracked: 0, tasks: [] }
    ])
  })

  test('a week across a year border runs from December into January', () => {
    expect(weekOf('2027-01-01', MONDAY)).toEqual({ first: '2026-12-28', last: '2027-01-03' })
  })
})

describe('moving between weeks', () => {
  test('the week before a week starting on the first of December crosses into November', () => {
    expect(weekBefore({ first: '2025-12-01', last: '2025-12-07' })).toEqual({ first: '2025-11-24', last: '2025-11-30' })
  })

  test('the week after the last full week of a year crosses into the next year', () => {
    expect(weekAfter({ first: '2026-12-21', last: '2026-12-27' })).toEqual({ first: '2026-12-28', last: '2027-01-03' })
  })
})

describe('the month containing a day', () => {
  test('a month runs from its first day to its last', () => {
    expect(monthOf('2026-11-18')).toEqual({ first: '2026-11-01', last: '2026-11-30' })
  })

  test('February of a leap year has 29 days', () => {
    expect(monthOf('2028-02-10')).toEqual({ first: '2028-02-01', last: '2028-02-29' })
  })

  test('the last day of December belongs to December', () => {
    expect(monthOf('2026-12-31')).toEqual({ first: '2026-12-01', last: '2026-12-31' })
  })

  test('the month before January is the December of the year before', () => {
    expect(monthBefore({ first: '2027-01-01', last: '2027-01-31' })).toEqual({ first: '2026-12-01', last: '2026-12-31' })
  })

  test('the month after December is the January of the year after', () => {
    expect(monthAfter({ first: '2026-12-01', last: '2026-12-31' })).toEqual({ first: '2027-01-01', last: '2027-01-31' })
  })
})

describe('the earliest tracked day', () => {
  test('is the earliest day any task has tracked time on, removed tasks included', () => {
    const tracked = {
      'write-report': { '2026-11-16': 25 * MINUTE, '2026-10-03': 5 * MINUTE },
      'old-project': { '2026-09-30': 10 * MINUTE, '2026-11-01': 10 * MINUTE }
    }

    expect(earliestTrackedDay(tracked)).toBe('2026-09-30')
  })

  test('an empty history has no earliest tracked day', () => {
    expect(earliestTrackedDay({})).toBeNull()
  })
})

describe('available ranges', () => {
  test('a week that ends before the earliest tracked day is not available', () => {
    expect(isAvailable({ first: '2026-11-02', last: '2026-11-08' }, '2026-11-09', '2026-11-18')).toBe(false)
  })

  test('a week that starts after today is not available', () => {
    expect(isAvailable({ first: '2026-11-23', last: '2026-11-29' }, '2026-11-09', '2026-11-18')).toBe(false)
  })

  test('with an empty history only the range holding today is available', () => {
    expect(isAvailable({ first: '2026-11-09', last: '2026-11-15' }, null, '2026-11-18')).toBe(false)
  })

  test('the month holding both the earliest tracked day and today is available', () => {
    expect(isAvailable({ first: '2026-11-01', last: '2026-11-30' }, '2026-11-09', '2026-11-18')).toBe(true)
  })
})

describe('day progress', () => {
  test('is the tracked time of a task on a day against its planned time', () => {
    const tracked = { 'write-report': { '2026-11-17': 20 * MINUTE, '2026-11-18': 30 * MINUTE } }

    expect(dayProgressOf(tracked, { id: 'write-report', plannedTime: 2 * HOUR }, '2026-11-18')).toEqual({ tracked: 30 * MINUTE, planned: 2 * HOUR, fraction: 0.25 })
  })

  test('goes past the whole when a task ran for longer than its planned time on a day', () => {
    const tracked = { 'write-report': { '2026-11-18': 3 * HOUR } }

    expect(dayProgressOf(tracked, { id: 'write-report', plannedTime: 2 * HOUR }, '2026-11-18').fraction).toBe(1.5)
  })

  test('is zero for a task with nothing tracked on the day', () => {
    expect(dayProgressOf({}, { id: 'write-report', plannedTime: 2 * HOUR }, '2026-11-18')).toEqual({ tracked: 0, planned: 2 * HOUR, fraction: 0 })
  })
})

describe('the task filter', () => {
  test('narrows the tracked time to the chosen tasks, so the totals count only theirs', () => {
    const tracked = {
      'write-report': { '2026-11-16': 25 * MINUTE },
      'read-mail': { '2026-11-16': 10 * MINUTE },
      'removed-task': { '2026-11-17': 5 * MINUTE }
    }

    const totals = totalsFor(narrowedTo(tracked, ['read-mail', 'removed-task']), { first: '2026-11-16', last: '2026-11-17' }, tasks)

    expect(totals.tracked).toBe(15 * MINUTE)
    expect(totals.tasks.map(({ taskId }) => taskId)).toEqual(['read-mail', 'removed-task'])
  })

  test('chooses all tasks when it chooses none', () => {
    const tracked = { 'write-report': { '2026-11-16': 25 * MINUTE }, 'removed-task': { '2026-11-17': 5 * MINUTE } }

    expect(narrowedTo(tracked, [])).toEqual(tracked)
  })

  test('offers every task in the order given, then each removed task with tracked time or repeat day results, without a name', () => {
    const tracked = { 'removed-b': { '2026-11-16': 5 * MINUTE }, 'read-mail': { '2026-11-16': 10 * MINUTE } }
    const results = { 'removed-a': { '2026-11-16': { planned: HOUR, tracked: 0, finished: false } } }

    expect(filterChoicesOf(tracked, results, tasks)).toEqual([
      { taskId: 'write-report', name: 'Write the report' },
      { taskId: 'read-mail', name: 'Read mail' },
      { taskId: 'practise-piano', name: 'Practise piano' },
      { taskId: 'removed-a', name: null },
      { taskId: 'removed-b', name: null }
    ])
  })
})

describe('repeat day results in a range', () => {
  test('give each task with results in the range its repeat days in order, how each went and how many were finished, the tasks in the order given and removed ones after', () => {
    const results = {
      'removed-task': { '2026-11-17': { planned: HOUR, tracked: HOUR, finished: true } },
      'practise-piano': {
        '2026-11-18': { planned: HOUR, tracked: HOUR, finished: true },
        '2026-11-09': { planned: HOUR, tracked: 0, finished: false },
        '2026-11-16': { planned: HOUR, tracked: 40 * MINUTE, finished: false }
      },
      'write-report': { '2026-11-17': { planned: 30 * MINUTE, tracked: 0, finished: false } }
    }

    expect(repeatDaysIn(results, { first: '2026-11-16', last: '2026-11-22' }, tasks)).toEqual([
      { taskId: 'write-report', name: 'Write the report', finished: 0, days: [{ day: '2026-11-17', planned: 30 * MINUTE, tracked: 0, finished: false }] },
      {
        taskId: 'practise-piano',
        name: 'Practise piano',
        finished: 1,
        days: [
          { day: '2026-11-16', planned: HOUR, tracked: 40 * MINUTE, finished: false },
          { day: '2026-11-18', planned: HOUR, tracked: HOUR, finished: true }
        ]
      },
      { taskId: 'removed-task', name: null, finished: 1, days: [{ day: '2026-11-17', planned: HOUR, tracked: HOUR, finished: true }] }
    ])
  })
})
