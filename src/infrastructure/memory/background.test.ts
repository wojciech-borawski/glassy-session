import { heardOwner } from '@/domain/music/model/playback'
import { createFocusSession, progressAt } from '@/domain/session/model/focus-session'
import { createTimer, remainingTimeAt } from '@/domain/timer/model/timer'
import { createMemoryBackground } from './background'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })

const morning = {
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
} as const

describe('the background kept in memory', () => {
  test('a focus session command runs on the session engine over the stored tasks, and the focus sessions follow what it saved', async () => {
    let now = NINE
    const { storedSessions } = createMemoryBackground({ now: () => now, timers: [writeReport] })

    expect(await storedSessions.send({ type: 'add', session: morning })).toBeNull()
    expect(await storedSessions.send({ type: 'start', sessionId: 'morning' })).toBeNull()
    now = NINE + 10 * MINUTE

    expect(storedSessions.sessions.value.map(({ id }) => id)).toEqual(['morning'])
    expect(progressAt(storedSessions.sessions.value[0]!, now)).toMatchObject({ state: 'focus step', currentStep: 0, remainingTime: 15 * MINUTE })
  })

  test('the timers follow a focus session command too, since its focus steps use up the remaining time of its tasks', async () => {
    let now = NINE
    const { storedTimers, storedSessions } = createMemoryBackground({ now: () => now, timers: [writeReport] })
    await storedSessions.send({ type: 'add', session: morning })
    await storedSessions.send({ type: 'start', sessionId: 'morning' })
    now = NINE + 10 * MINUTE

    await storedSessions.send({ type: 'pause', sessionId: 'morning' })

    expect(remainingTimeAt(storedTimers.timers.value[0]!, NINE + HOUR)).toBe(40 * MINUTE)
  })

  test('starts with the focus sessions it is given, and a command that fails resolves as a failure that leaves them as they were', async () => {
    const saved = createFocusSession(morning, [{ taskId: 'write-report', remainingTime: 50 * MINUTE }])
    const { storedSessions } = createMemoryBackground({ now: () => NINE, timers: [writeReport], sessions: [saved] })

    const refusal = await storedSessions.send({ type: 'change', sessionId: 'morning', settings: { ...morning, name: ' ' } })

    expect(refusal).toEqual({ reason: 'failed', message: 'A focus session needs a name' })
    expect(storedSessions.sessions.value).toEqual([saved])
  })

  test('the tracked time starts from what it is given and follows the spans a command records', async () => {
    let now = NINE
    const earlier = { 'write-report': { '2026-11-16': 20 * MINUTE } }
    const { storedTimers, storedTrackedTime } = createMemoryBackground({ now: () => now, timers: [writeReport], trackedTime: earlier })
    expect(storedTrackedTime.trackedTime.value).toEqual(earlier)

    await storedTimers.send({ type: 'start', timerId: 'write-report' })
    now = NINE + 10 * MINUTE
    await storedTimers.send({ type: 'pause', timerId: 'write-report' })

    expect(storedTrackedTime.trackedTime.value).toEqual({ 'write-report': { '2026-11-16': 20 * MINUTE, '2026-11-17': 10 * MINUTE } })
  })
})

describe('the background sounds of the background kept in memory', () => {
  test('a timer that starts with a playlist is heard, and the playlists it was given follow the playback', async () => {
    const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }] }
    const owner = { of: 'timer', id: 'write-report' } as const
    const { storedTimers, storedPlaylists } = createMemoryBackground({
      now: () => NINE,
      timers: [writeReport],
      music: { playlists: [focusMix], backgroundSounds: [{ owner, sound: { playlistId: 'focus-mix', volume: 0.3 } }] }
    })

    await storedTimers.send({ type: 'start', timerId: 'write-report' })

    expect(storedPlaylists.playback.value.playing).toMatchObject({ owner, fileId: 'rain' })
    expect(heardOwner(storedPlaylists.playback.value, { playlists: storedPlaylists.playlists.value, soundOf: () => ({ playlistId: 'focus-mix', volume: 0.3 }) })).toEqual(owner)
  })
})

