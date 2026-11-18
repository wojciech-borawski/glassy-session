import { fakeBrowser } from 'wxt/testing/fake-browser'
import { progressAt } from '@/domain/session/model/focus-session'
import { remainingTimeAt, runStateAt } from '@/domain/timer/model/timer'
import { trackedOn } from '@/domain/tracking/model/tracked-time'
import { fakeOffscreen } from '@/infrastructure/browser/fake-offscreen'
import { sendSessionCommand } from '@/infrastructure/browser/session-commands'
import { readStoredSessions } from '@/infrastructure/browser/session-store'
import { createBrowserSoundSettingsStore } from '@/infrastructure/browser/sound-settings-store'
import { createBrowserTimerStore } from '@/infrastructure/browser/timer-store'
import { createBrowserTrackedTimeStore } from '@/infrastructure/browser/tracked-time-store'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { runEngines } from './run-engines'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const HOUR = 60 * MINUTE

const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const
const writeReport = { id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' } } as const

beforeEach(() => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
  runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

async function storedTimer(id: string) {
  const timer = (await createBrowserTimerStore().load()).find((stored) => stored.id === id)
  if (timer === undefined) {
    throw new Error(`No stored timer ${id}`)
  }
  return timer
}

async function alarmTimes() {
  return (await browser.alarms.getAll()).map((alarm) => alarm.scheduledTime)
}

async function fireAllAlarms() {
  for (const alarm of await browser.alarms.getAll()) {
    await fakeBrowser.alarms.onAlarm.trigger(alarm)
  }
}

describe('the background running timers', () => {
  test('a start command stores the timer as running and sets an alarm at the moment it will finish', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })

    await sendTimerCommand({ type: 'start', timerId: 'tea' })

    expect(runStateAt(await storedTimer('tea'), NINE + MINUTE)).toBe('running')
    expect(await alarmTimes()).toEqual([NINE + 3 * MINUTE])
  })

  test('the wake alarm going off after the finish moment finishes the task, tracks its time and shows a notification', async () => {
    await sendTimerCommand({ type: 'add', timer: writeReport })
    await sendTimerCommand({ type: 'start', timerId: 'write-report' })
    vi.setSystemTime(NINE + 26 * MINUTE)

    await fireAllAlarms()

    expect(runStateAt(await storedTimer('write-report'), NINE + HOUR)).toBe('finished')
    expect(trackedOn(await createBrowserTrackedTimeStore().load(), 'write-report', '2026-11-17')).toBe(25 * MINUTE)
    expect(Object.values(fakeBrowser.notifications.getAllCreateOptions())).toEqual([expect.objectContaining({ title: 'Write report' })])
    expect(await alarmTimes()).toEqual([])
  })

  test('the browser starting rings a timer that ran out while the browser was closed', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    vi.setSystemTime(NINE + HOUR)

    await fakeBrowser.runtime.onStartup.trigger()

    expect(runStateAt(await storedTimer('tea'), NINE + HOUR)).toBe('finished')
    expect(Object.values(fakeBrowser.notifications.getAllCreateOptions())).toEqual([expect.objectContaining({ title: 'Tea' })])
  })

  test('the extension being updated sets the alarm again for a timer still running, since an update clears alarms', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    await browser.alarms.clearAll()
    vi.setSystemTime(NINE + MINUTE)

    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '0.0.1' })

    expect(await alarmTimes()).toEqual([NINE + 3 * MINUTE])
  })

  test('a notification the system refuses keeps no other timer from ringing, and the command that rang them answers as done', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'add', timer: { ...tea, id: 'egg', name: 'Egg' } })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    await sendTimerCommand({ type: 'start', timerId: 'egg' })
    vi.setSystemTime(NINE + HOUR)
    vi.spyOn(browser.notifications, 'create').mockRejectedValueOnce(new Error('Notifications are blocked'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const refusal = await sendTimerCommand({ type: 'pin', timerId: 'tea' })

    expect(refusal).toBeNull()
    expect(vi.mocked(browser.notifications.create).mock.calls).toEqual([
      [expect.any(String), expect.objectContaining({ title: 'Tea' })],
      [expect.any(String), expect.objectContaining({ title: 'Egg' })]
    ])
  })

  test('a change command changes the stored timer and moves its alarm to its new finish', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })

    const refusal = await sendTimerCommand({ type: 'change', timerId: 'tea', details: { name: 'Green tea', plannedTime: 4 * MINUTE, appearance: { colour: 'green' } } })

    expect(refusal).toBeNull()
    expect(await storedTimer('tea')).toMatchObject({ name: 'Green tea', plannedTime: 4 * MINUTE })
    expect(await alarmTimes()).toEqual([NINE + 4 * MINUTE])
  })

  test('a command that fails answers its sender with a failure that says why, and changes nothing', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    const before = await browser.storage.local.get()

    const refusal = await sendTimerCommand({ type: 'add', timer: { ...tea, id: 'nameless', name: ' ' } })

    expect(refusal).toEqual({ reason: 'failed', message: 'A timer needs a name' })
    expect(await browser.storage.local.get()).toEqual(before)
  })

  test('a message that is not a command changes nothing', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    const before = await browser.storage.local.get()

    await browser.runtime.sendMessage({ type: 'add', timer: { id: 'wake-up', name: 'Wake up', kind: 'alarm', plannedTime: MINUTE } })

    expect(await browser.storage.local.get()).toEqual(before)
    expect(await alarmTimes()).toEqual([])
  })
})

describe('the background waking for a wake less than 30 seconds away', () => {
  const egg = { id: 'egg', name: 'Egg', kind: 'timer', plannedTime: 20_000, appearance: { colour: 'gold' } } as const

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(NINE)
  })

  function ringsShown() {
    return vi.mocked(browser.notifications.create).mock.calls.length
  }

  test('a timer rings at its moment, before its alarm goes off, and the alarm then rings it no more', async () => {
    vi.spyOn(browser.notifications, 'create')
    await sendTimerCommand({ type: 'add', timer: egg })
    await sendTimerCommand({ type: 'start', timerId: 'egg' })
    const [alarm] = await browser.alarms.getAll()

    await vi.advanceTimersByTimeAsync(20_000)
    const ringsBeforeTheAlarm = ringsShown()
    await fakeBrowser.alarms.onAlarm.trigger(alarm!)

    expect(ringsBeforeTheAlarm).toBe(1)
    expect(ringsShown()).toBe(1)
  })

  test('a timer whose alarm goes off first rings once, and its timeout then rings it no more', async () => {
    vi.spyOn(browser.notifications, 'create')
    await sendTimerCommand({ type: 'add', timer: egg })
    await sendTimerCommand({ type: 'start', timerId: 'egg' })
    const [alarm] = await browser.alarms.getAll()
    vi.setSystemTime(NINE + 20_000)

    await fakeBrowser.alarms.onAlarm.trigger(alarm!)
    const ringsAfterTheAlarm = ringsShown()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(ringsAfterTheAlarm).toBe(1)
    expect(ringsShown()).toBe(1)
  })

  test('a timer due 10 seconds after another rings at its moment, though its alarm cannot go off until 30 seconds after the other\'s', async () => {
    vi.spyOn(browser.notifications, 'create')
    await sendTimerCommand({ type: 'add', timer: { ...egg, id: 'egg', plannedTime: 60_000 } })
    await sendTimerCommand({ type: 'add', timer: { ...egg, id: 'toast', name: 'Toast', plannedTime: 70_000 } })
    await sendTimerCommand({ type: 'start', timerId: 'egg' })
    await sendTimerCommand({ type: 'start', timerId: 'toast' })
    const eggAlarm = (await browser.alarms.getAll()).find(({ name }) => name.endsWith(':egg'))
    vi.setSystemTime(NINE + 60_000)
    await fakeBrowser.alarms.onAlarm.trigger(eggAlarm!)

    await vi.advanceTimersByTimeAsync(10_000)

    expect(vi.mocked(browser.notifications.create).mock.calls).toEqual([
      [expect.any(String), expect.objectContaining({ title: 'Egg' })],
      [expect.any(String), expect.objectContaining({ title: 'Toast' })]
    ])
  })
})

const morning = { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 10 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' } as const

async function storedSession(id: string) {
  const session = (await readStoredSessions()).find((stored) => stored.id === id)
  if (session === undefined) {
    throw new Error(`No stored focus session ${id}`)
  }
  return session
}

describe('the background running focus sessions', () => {
  beforeEach(async () => {
    await sendTimerCommand({ type: 'add', timer: writeReport })
    await sendSessionCommand({ type: 'add', session: morning })
  })

  test('a start command stores the session as running and sets an alarm at the moment its first focus step ends', async () => {
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })

    expect(progressAt(await storedSession('morning'), NINE + MINUTE).state).toBe('focus step')
    expect(await alarmTimes()).toEqual([NINE + 10 * MINUTE])
  })

  test('the wake alarm going off after the first focus step ended stores the break, uses up and tracks the task\'s time and shows a notification', async () => {
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    vi.setSystemTime(NINE + 12 * MINUTE)

    await fireAllAlarms()

    expect(progressAt(await storedSession('morning'), NINE + 12 * MINUTE).state).toBe('break')
    expect(remainingTimeAt(await storedTimer('write-report'), NINE + 12 * MINUTE)).toBe(15 * MINUTE)
    expect(trackedOn(await createBrowserTrackedTimeStore().load(), 'write-report', '2026-11-17')).toBe(10 * MINUTE)
    expect(Object.values(fakeBrowser.notifications.getAllCreateOptions())).toEqual([expect.objectContaining({ title: 'Morning', message: 'A focus step has ended.' })])
    expect(await alarmTimes()).toEqual([NINE + 15 * MINUTE])
  })

  test('ending a session early changes the stored timers and focus sessions in one storage change, so no view reads one without the other', async () => {
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    vi.setSystemTime(NINE + 5 * MINUTE)
    const changes: string[][] = []
    browser.storage.onChanged.addListener((changed) => changes.push(Object.keys(changed).filter((key) => key === 'timers' || key === 'focusSessions').sort()))

    await sendSessionCommand({ type: 'endEarly', sessionId: 'morning' })

    expect(changes.filter((keys) => keys.length > 0)).toEqual([['focusSessions', 'timers']])
  })

  test('starting a session whose task runs on its own is refused with that task, and nothing changes', async () => {
    await sendTimerCommand({ type: 'start', timerId: 'write-report' })
    await vi.waitFor(async () => expect(await browser.storage.local.get('playback')).toHaveProperty('playback.owners'))
    const before = { stored: await browser.storage.local.get(), alarms: await alarmTimes() }

    const refusal = await sendSessionCommand({ type: 'start', sessionId: 'morning' })

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: null })
    expect({ stored: await browser.storage.local.get(), alarms: await alarmTimes() }).toEqual(before)
  })

  test('starting a task on its own while a running session uses it is refused with that task', async () => {
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })

    const refusal = await sendTimerCommand({ type: 'start', timerId: 'write-report' })

    expect(refusal).toEqual({ reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } })
    expect((await storedTimer('write-report')).runningSince).toBeNull()
  })

  test('the browser starting settles a session whose focus step ended while the browser was closed', async () => {
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    vi.setSystemTime(NINE + 12 * MINUTE)

    await fakeBrowser.runtime.onStartup.trigger()

    expect(progressAt(await storedSession('morning'), NINE + 12 * MINUTE).state).toBe('break')
    expect(Object.values(fakeBrowser.notifications.getAllCreateOptions())).toEqual([expect.objectContaining({ title: 'Morning' })])
  })
})

describe('the background playing sounds in Chromium', () => {
  test('a timer that finishes asks the player to play its ring sound once, at the volume set for rings and chimes', async () => {
    const offscreen = fakeOffscreen()
    await sendTimerCommand({ type: 'add', timer: { ...tea, ringSound: { kind: 'built-in', name: 'digital' } } })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    vi.setSystemTime(NINE + 4 * MINUTE)

    await fireAllAlarms()

    expect(offscreen.playerInDocument().played).toEqual([{ sound: { kind: 'built-in', name: 'digital' }, volume: 0.8 }])
  })

  test('a focus step that ends plays the end chime chosen in settings', async () => {
    const offscreen = fakeOffscreen()
    await createBrowserSoundSettingsStore().save({ endChime: { kind: 'audio file', fileId: 'gong' }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.5 })
    await sendTimerCommand({ type: 'add', timer: writeReport })
    await sendSessionCommand({ type: 'add', session: morning })
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    vi.setSystemTime(NINE + 11 * MINUTE)

    await fireAllAlarms()

    expect(offscreen.playerInDocument().played).toEqual([{ sound: { kind: 'audio file', fileId: 'gong' }, volume: 0.5 }])
  })
})
