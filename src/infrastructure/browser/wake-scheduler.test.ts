import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserWakeScheduler } from './wake-scheduler'

const NINE = Date.UTC(2026, 10, 17, 9)

/** A clock an hour before every wake, so no wake is less than 30 seconds away. */
const anHourBefore = () => NINE - 3_600_000

const teaWake = { of: 'timer', id: 'tea' } as const
const writeReportWake = { of: 'timer', id: 'write-report' } as const

beforeEach(() => {
  fakeBrowser.reset()
})

async function scheduledTimes() {
  return (await browser.alarms.getAll()).map((alarm) => alarm.scheduledTime)
}

async function fireAllAlarms() {
  for (const alarm of await browser.alarms.getAll()) {
    await fakeBrowser.alarms.onAlarm.trigger(alarm)
  }
}

describe('the browser wake scheduler', () => {
  test('a wake sets an alarm at its moment', async () => {
    await createBrowserWakeScheduler(anHourBefore).wakeAt(teaWake, NINE)

    expect(await scheduledTimes()).toEqual([NINE])
  })

  test('a timer\'s new wake replaces its earlier one and leaves other timers\' wakes', async () => {
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    await wakeScheduler.wakeAt(teaWake, NINE)
    await wakeScheduler.wakeAt(writeReportWake, NINE + 2)

    await wakeScheduler.wakeAt(teaWake, NINE + 1)

    expect((await scheduledTimes()).sort()).toEqual([NINE + 1, NINE + 2])
  })

  test('cancelling a wake removes only that timer\'s alarm', async () => {
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    await wakeScheduler.wakeAt(teaWake, NINE)
    await wakeScheduler.wakeAt(writeReportWake, NINE + 2)

    await wakeScheduler.cancel(teaWake)

    expect(await scheduledTimes()).toEqual([NINE + 2])
  })

  test('the scheduled wakes are the wakes set, of every kind, at their moments, and no other alarm', async () => {
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    await browser.alarms.create('tea', { when: NINE })
    await wakeScheduler.wakeAt(teaWake, NINE)
    await wakeScheduler.wakeAt({ of: 'focus session', id: 'morning:plan' }, NINE + 1)
    await wakeScheduler.wakeAt({ of: 'alarm', id: 'tea' }, NINE + 2)
    await wakeScheduler.wakeAt(writeReportWake, NINE + 3)
    await wakeScheduler.cancel(writeReportWake)

    expect(await wakeScheduler.scheduled()).toEqual(expect.arrayContaining([
      { wake: teaWake, moment: NINE },
      { wake: { of: 'focus session', id: 'morning:plan' }, moment: NINE + 1 },
      { wake: { of: 'alarm', id: 'tea' }, moment: NINE + 2 }
    ]))
    expect(await wakeScheduler.scheduled()).toHaveLength(3)
  })

  test('a wake\'s alarm going off calls the wake listener', async () => {
    const woken = vi.fn()
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    wakeScheduler.onWake(woken)
    await wakeScheduler.wakeAt(teaWake, NINE)

    await fireAllAlarms()

    expect(woken).toHaveBeenCalledOnce()
  })

  test('an alarm that is not a wake does not call the wake listener', async () => {
    const woken = vi.fn()
    createBrowserWakeScheduler(anHourBefore).onWake(woken)
    await browser.alarms.create('alarm:morning', { when: NINE })

    await fireAllAlarms()

    expect(woken).not.toHaveBeenCalled()
  })

  test('a wake does not replace or cancel another alarm of the same name as its timer', async () => {
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    await browser.alarms.create('tea', { when: NINE })

    await wakeScheduler.wakeAt(teaWake, NINE + 1)
    await wakeScheduler.cancel(teaWake)

    expect(await scheduledTimes()).toEqual([NINE])
  })

  test('an alarm\'s wake has its own browser alarm beside a timer\'s with the same id, and it calls the wake listener', async () => {
    const woken = vi.fn()
    const wakeScheduler = createBrowserWakeScheduler(anHourBefore)
    wakeScheduler.onWake(woken)
    await wakeScheduler.wakeAt(teaWake, NINE)
    await wakeScheduler.wakeAt({ of: 'alarm', id: 'tea' }, NINE + 1)
    await wakeScheduler.cancel(teaWake)

    await fireAllAlarms()

    expect(await scheduledTimes()).toEqual([NINE + 1])
    expect(woken).toHaveBeenCalledOnce()
  })
})
