import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserStoredTrackedTime } from './stored-tracked-time'
import { createBrowserRepeatDayResultStore, createBrowserTrackedTimeStore } from './tracked-time-store'

const monday = { 'write-report': { '2026-11-16': 600_000 } }
const mondayAndTuesday = { 'write-report': { '2026-11-16': 600_000, '2026-11-17': 300_000 } }
const gymOnMonday = { gym: { '2026-11-16': { planned: 3_600_000, tracked: 2_400_000, finished: false } } }
const gymOnMondayAndWednesday = { gym: { ...gymOnMonday.gym, '2026-11-18': { planned: 3_600_000, tracked: 3_600_000, finished: true } } }

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored tracked time as the browser keeps it', () => {
  test('the tracked time is the one in storage, first as read and then after each save', async () => {
    await createBrowserTrackedTimeStore().save(monday)
    const stored = createBrowserStoredTrackedTime()

    await vi.waitFor(() => expect(stored.trackedTime.value).toEqual(monday))
    await createBrowserTrackedTimeStore().save(mondayAndTuesday)

    await vi.waitFor(() => expect(stored.trackedTime.value).toEqual(mondayAndTuesday))
  })

  test('a save made while the first read is under way is not overwritten by what that read found', async () => {
    await createBrowserTrackedTimeStore().save(monday)
    const stored = createBrowserStoredTrackedTime()

    await createBrowserTrackedTimeStore().save(mondayAndTuesday)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored.trackedTime.value).toEqual(mondayAndTuesday)
  })

  test('stops following storage when the scope it was created in ends', async () => {
    const scope = effectScope()
    const stored = scope.run(() => createBrowserStoredTrackedTime())
    await createBrowserTrackedTimeStore().save(monday)
    await vi.waitFor(() => expect(stored?.trackedTime.value).toEqual(monday))

    scope.stop()
    await createBrowserTrackedTimeStore().save(mondayAndTuesday)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored?.trackedTime.value).toEqual(monday)
  })

  test('the repeat day results are the ones in storage, first as read and then after each save', async () => {
    await createBrowserRepeatDayResultStore().save(gymOnMonday)
    const stored = createBrowserStoredTrackedTime()

    await vi.waitFor(() => expect(stored.repeatDayResults.value).toEqual(gymOnMonday))
    await createBrowserRepeatDayResultStore().save(gymOnMondayAndWednesday)

    await vi.waitFor(() => expect(stored.repeatDayResults.value).toEqual(gymOnMondayAndWednesday))
  })
})
