import { createFocusSession, endEarly, pause as pauseSession, resume, settle as settleSession, skip, start as startSession } from '../session/model/focus-session'
import { createTimer, pause, reset, settle, start } from '../timer/model/timer'
import { soundOwnerEventsBetween } from './sound-owner-events'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const pasta = createTimer({ id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'gold' } })
const pastaRunning = start(pasta, NINE).timer
const pastaPaused = pause(pastaRunning, NINE + MINUTE).timer

describe('what a timer did that its background sound follows', () => {
  test('an idle timer that runs has started', () => {
    expect(soundOwnerEventsBetween({ timers: [pasta], sessions: [] }, { timers: [pastaRunning], sessions: [] }))
      .toEqual([{ type: 'owner started', owner: { of: 'timer', id: 'pasta' } }])
  })

  test('a running timer that pauses has paused, and one that runs again has resumed', () => {
    expect(soundOwnerEventsBetween({ timers: [pastaRunning], sessions: [] }, { timers: [pastaPaused], sessions: [] }))
      .toEqual([{ type: 'owner paused', owner: { of: 'timer', id: 'pasta' } }])
    expect(soundOwnerEventsBetween({ timers: [pastaPaused], sessions: [] }, { timers: [start(pastaPaused, NINE + 2 * MINUTE).timer], sessions: [] }))
      .toEqual([{ type: 'owner resumed', owner: { of: 'timer', id: 'pasta' } }])
  })

  test.each([
    ['a running timer that ran out', pastaRunning, [settle(pastaRunning, NINE + 11 * MINUTE).timer]],
    ['a paused timer that was reset', pastaPaused, [reset(pastaPaused, NINE + 2 * MINUTE).timer]],
    ['a running timer that was removed', pastaRunning, []]
  ])('%s has finished, so its place is forgotten', (_what, was, timers) => {
    expect(soundOwnerEventsBetween({ timers: [was], sessions: [] }, { timers, sessions: [] }))
      .toEqual([{ type: 'owner finished', owner: { of: 'timer', id: 'pasta' } }])
  })
})

const tasks = [{ taskId: 'write', remainingTime: 50 * MINUTE }]
const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: ['write'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, tasks)
const morningInFocus = startSession(morning, tasks, NINE).session
const morningInBreak = settleSession(morningInFocus, NINE + 26 * MINUTE).session
const morningOwner = { of: 'focus session', id: 'morning' } as const

const between = (before: typeof morning, after: typeof morning | null) => soundOwnerEventsBetween({ timers: [], sessions: [before] }, { timers: [], sessions: after === null ? [] : [after] })

describe('what a focus session did that its background sound follows', () => {
  test('an idle focus session that starts has started', () => {
    expect(between(morning, morningInFocus)).toEqual([{ type: 'owner started', owner: morningOwner }])
  })

  test.each([
    ['pauses has paused', morningInFocus, pauseSession(morningInFocus, NINE + MINUTE).session, 'owner paused'],
    ['resumes has resumed', pauseSession(morningInFocus, NINE + MINUTE).session, resume(pauseSession(morningInFocus, NINE + MINUTE).session, NINE + 2 * MINUTE).session, 'owner resumed'],
    ['ends early has finished', morningInFocus, endEarly(morningInFocus, NINE + MINUTE).session, 'owner finished'],
    ['runs to its end has finished', morningInFocus, settleSession(morningInFocus, NINE + 2 * 60 * MINUTE).session, 'owner finished'],
    ['is removed has finished', morningInFocus, null, 'owner finished']
  ] as const)('a focus session that %s', (_what, before, after, type) => {
    expect(between(before, after)).toEqual([{ type, owner: morningOwner }])
  })

  test('a running focus session whose break starts has started a break, and one whose next focus step starts has started a focus step', () => {
    expect(between(morningInFocus, morningInBreak)).toEqual([{ type: 'break started' }])
    expect(between(morningInBreak, skip(morningInBreak, NINE + 27 * MINUTE).session)).toEqual([{ type: 'focus step started' }])
  })
})
