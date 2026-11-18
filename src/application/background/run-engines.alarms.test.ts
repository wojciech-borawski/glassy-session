import { fakeBrowser } from 'wxt/testing/fake-browser'
import { sendAlarmCommand } from '@/infrastructure/browser/alarm-commands'
import { readStoredAlarms } from '@/infrastructure/browser/alarm-store'
import { runEngines } from './run-engines'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Tuesday 17 November 2026, 09:00 on the local clock. */
const TUESDAY_NINE = new Date(2026, 10, 17, 9).getTime()

const wakeUp = { id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true } as const

beforeEach(async () => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TUESDAY_NINE)
  await runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

async function fireAllAlarms() {
  for (const alarm of await browser.alarms.getAll()) {
    await fakeBrowser.alarms.onAlarm.trigger(alarm)
  }
}

function shownNotifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

async function alarmTimes() {
  return (await browser.alarms.getAll()).map((alarm) => alarm.scheduledTime)
}

describe('the background running alarms', () => {
  test('an add command stores the alarm switched on and sets a browser alarm at its next ring', async () => {
    const refusal = await sendAlarmCommand({ type: 'add', alarm: wakeUp })

    expect(refusal).toBeNull()
    expect(await readStoredAlarms()).toEqual([{ ...wakeUp, switchedOn: true }])
    expect(await alarmTimes()).toEqual([new Date(2026, 10, 18, 7, 30).getTime()])
  })

  test('the wake going off at the moment of an alarm rings it once, with its notification, and sets the wake for its next ring', async () => {
    await sendAlarmCommand({ type: 'add', alarm: wakeUp })
    vi.setSystemTime(new Date(2026, 10, 18, 7, 30, 1))

    await fireAllAlarms()
    await fireAllAlarms()

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Wake up', message: 'It is 07:30.' })])
    expect(shownNotifications()[0]).not.toHaveProperty('silent')
    expect(await alarmTimes()).toEqual([new Date(2026, 10, 19, 7, 30).getTime()])
  })

  test('the browser starting after an alarm was due while it was closed tells it as missed once, quietly, and nothing rings', async () => {
    await sendAlarmCommand({ type: 'add', alarm: wakeUp })
    vi.setSystemTime(new Date(2026, 10, 20, 12))

    await fakeBrowser.runtime.onStartup.trigger()
    await fireAllAlarms()

    expect(shownNotifications()).toEqual([{
      type: 'basic',
      iconUrl: expect.any(String),
      title: 'Wake up',
      message: 'Missed: it was due at 07:30 on Friday, November 20.',
      silent: true
    }])
    expect(await alarmTimes()).toEqual([new Date(2026, 10, 23, 7, 30).getTime()])
  })

  test('the extension being updated sets the wakes of switched on alarms again, since an update clears browser alarms', async () => {
    await sendAlarmCommand({ type: 'add', alarm: wakeUp })
    await browser.alarms.clearAll()

    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '0.0.1' })

    expect(await alarmTimes()).toEqual([new Date(2026, 10, 18, 7, 30).getTime()])
  })

  test('an alarm command the model refuses answers with a failure that says why, and changes nothing', async () => {
    await sendAlarmCommand({ type: 'add', alarm: wakeUp })
    const before = await browser.storage.local.get()

    const refusal = await sendAlarmCommand({ type: 'change', alarmId: 'wake-up', details: { ...wakeUp, days: { kind: 'repeating', repeatDays: [] } } })

    expect(refusal).toEqual({ reason: 'failed', message: 'A repeating alarm needs at least one repeat day' })
    expect(await browser.storage.local.get()).toEqual(before)
  })
})
