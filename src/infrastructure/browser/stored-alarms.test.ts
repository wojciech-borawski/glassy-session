import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createAlarm } from '@/domain/alarm/model/alarm'
import { createBrowserAlarmStore } from './alarm-store'
import { createBrowserStoredAlarms } from './stored-alarms'

const HOUR = 3_600_000
const NINE = Date.UTC(2026, 10, 17, 9)

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored alarms as the browser keeps them', () => {
  test('the alarms are those in storage, first as read and then after each save', async () => {
    await createBrowserAlarmStore().save({ alarms: [wakeUp], checkedUpTo: NINE })
    const stored = createBrowserStoredAlarms()

    await vi.waitFor(() => expect(stored.alarms.value).toEqual([wakeUp]))
    await createBrowserAlarmStore().save({ alarms: [wakeUp, dentist], checkedUpTo: NINE })

    await vi.waitFor(() => expect(stored.alarms.value).toEqual([wakeUp, dentist]))
  })

  test('a save made while the first read is under way is not overwritten by what that read found', async () => {
    const stored = createBrowserStoredAlarms()

    await createBrowserAlarmStore().save({ alarms: [dentist], checkedUpTo: NINE })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored.alarms.value).toEqual([dentist])
  })

  test('stops following storage when the scope it was created in ends', async () => {
    const scope = effectScope()
    const stored = scope.run(() => createBrowserStoredAlarms())
    await createBrowserAlarmStore().save({ alarms: [dentist], checkedUpTo: NINE })
    await vi.waitFor(() => expect(stored?.alarms.value).toEqual([dentist]))

    scope.stop()
    await createBrowserAlarmStore().save({ alarms: [wakeUp], checkedUpTo: NINE })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored?.alarms.value).toEqual([dentist])
  })

  test('a command goes to the background as a message and resolves with the answer of the background', async () => {
    const received: unknown[] = []
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      received.push(message)
      sendResponse({ refusal: null })
      return true
    })

    const refusal = await createBrowserStoredAlarms().send({ type: 'switchOff', alarmId: 'wake-up' })

    expect(refusal).toBeNull()
    expect(received).toEqual([{ type: 'switchOff', alarmId: 'wake-up' }])
  })
})
