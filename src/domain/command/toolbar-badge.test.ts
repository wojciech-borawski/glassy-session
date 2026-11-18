import { createFocusSession, pause as pauseSession, settle as settleSession, start as startSession } from '../session/model/focus-session'
import { createTimer, pause, start } from '../timer/model/timer'
import { localDayOf } from '../tracking/local-day'
import { settledAsOf } from './command-runner'
import { toolbarBadgeAt } from './toolbar-badge'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const pasta = createTimer({ id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'gold' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })

const tasks = [{ taskId: 'write', remainingTime: 50 * MINUTE }]
const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: ['write'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, tasks)
const morningRunning = startSession(morning, tasks, NINE).session
/** Morning's first break runs from 9:25 to 9:30. */
const IN_BREAK = NINE + 26 * MINUTE

describe('the toolbar badge', () => {
  test('counts the timers that run', () => {
    const timers = [start(pasta, NINE).timer, start(tea, NINE).timer]

    expect(toolbarBadgeAt({ timers, sessions: [] }, NINE + MINUTE)).toEqual({ text: '2', look: 'running' })
  })

  test('shows nothing while nothing runs', () => {
    expect(toolbarBadgeAt({ timers: [pasta, tea], sessions: [] }, NINE)).toBeNull()
  })

  test('leaves out a paused timer and one that ran out before the moment', () => {
    const timers = [pause(start(pasta, NINE).timer, NINE + MINUTE).timer, start(tea, NINE).timer]

    expect(toolbarBadgeAt({ timers, sessions: [] }, NINE + 4 * MINUTE)).toBeNull()
  })

  test('counts a focus session in a focus step as running', () => {
    expect(toolbarBadgeAt({ timers: [], sessions: [morningRunning, morning] }, NINE + MINUTE)).toEqual({ text: '1', look: 'running' })
  })

  test('leaves out a focus session paused in a focus step or in a break, and one whose run ended before the moment', () => {
    const pausedInFocusStep = pauseSession(morningRunning, NINE + MINUTE).session
    const pausedInBreak = pauseSession(settleSession(morningRunning, IN_BREAK).session, IN_BREAK).session
    const sessions = [pausedInFocusStep, pausedInBreak, { ...morningRunning, id: 'evening' }]

    expect(toolbarBadgeAt({ timers: [], sessions }, NINE + 2 * 60 * MINUTE)).toBeNull()
  })

  test('looks on break while every one that runs is a focus session on a break', () => {
    const sessions = [morningRunning, { ...morningRunning, id: 'evening' }]

    expect(toolbarBadgeAt({ timers: [], sessions }, IN_BREAK)).toEqual({ text: '2', look: 'on break' })
  })

  test('looks running while a timer runs beside a focus session on a break', () => {
    const timers = [start(pasta, NINE + 20 * MINUTE).timer]

    expect(toolbarBadgeAt({ timers, sessions: [morningRunning] }, IN_BREAK)).toEqual({ text: '2', look: 'running' })
  })

  test('looks running while another focus session is in a focus step', () => {
    const evening = startSession({ ...morning, id: 'evening' }, tasks, NINE + 20 * MINUTE).session

    expect(toolbarBadgeAt({ timers: [], sessions: [morningRunning, evening] }, IN_BREAK)).toEqual({ text: '2', look: 'running' })
  })

  test('counts a task in the run of a focus session once, as the session', () => {
    const write = createTimer({ id: 'write', name: 'Write', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })

    const { stored } = settledAsOf({ timers: [write], sessions: [morningRunning] }, NINE + MINUTE, localDayOf)

    expect(toolbarBadgeAt(stored, NINE + MINUTE)).toEqual({ text: '1', look: 'running' })
  })

  test('shows 9 while nine run', () => {
    const timers = Array.from({ length: 9 }, (_, index) => start({ ...pasta, id: `pasta-${index}` }, NINE).timer)

    expect(toolbarBadgeAt({ timers, sessions: [] }, NINE + MINUTE)).toEqual({ text: '9', look: 'running' })
  })

  test('shows 9+ once more than nine run', () => {
    const timers = Array.from({ length: 10 }, (_, index) => start({ ...pasta, id: `pasta-${index}` }, NINE).timer)

    expect(toolbarBadgeAt({ timers, sessions: [] }, NINE + MINUTE)).toEqual({ text: '9+', look: 'running' })
  })
})
