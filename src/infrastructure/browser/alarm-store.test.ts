import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createAlarm, type Alarm } from '@/domain/alarm/model/alarm'
import { createBrowserAlarmStore, readStoredAlarms, watchStoredAlarms } from './alarm-store'

beforeEach(() => {
  fakeBrowser.reset()
})

const NINE = Date.UTC(2026, 10, 17, 9)

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 25_200_000, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })

describe('the browser alarm store', () => {
  test('an empty storage loads as no alarms, never checked', async () => {
    expect(await createBrowserAlarmStore().load()).toEqual({ alarms: [], checkedUpTo: null })
  })

  test('saved alarms and the moment they were checked up to load back, also in a store created later', async () => {
    await createBrowserAlarmStore().save({ alarms: [wakeUp], checkedUpTo: NINE })

    expect(await createBrowserAlarmStore().load()).toEqual({ alarms: [wakeUp], checkedUpTo: NINE })
  })

  test('other contexts read the alarms the background saved', async () => {
    await createBrowserAlarmStore().save({ alarms: [wakeUp], checkedUpTo: NINE })

    expect(await readStoredAlarms()).toEqual([wakeUp])
  })

  test('a watcher hears each save with the alarms saved, until it stops watching', async () => {
    const heard: (readonly Alarm[])[] = []
    const stopWatching = watchStoredAlarms((alarms) => heard.push(alarms))

    await createBrowserAlarmStore().save({ alarms: [wakeUp], checkedUpTo: NINE })
    stopWatching()
    await createBrowserAlarmStore().save({ alarms: [], checkedUpTo: NINE })

    expect(heard).toEqual([[wakeUp]])
  })
})
