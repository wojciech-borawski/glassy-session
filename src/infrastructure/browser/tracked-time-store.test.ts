import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserRepeatDayResultStore, createBrowserTrackedTimeStore } from './tracked-time-store'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the browser tracked-time store', () => {
  test('an empty storage loads as empty tracked time', async () => {
    expect(await createBrowserTrackedTimeStore().load()).toEqual({})
  })

  test('saved tracked time loads back, also in a store created later', async () => {
    const trackedTime = { 'write-report': { '2026-11-17': 600_000, '2026-11-18': 300_000 } }

    await createBrowserTrackedTimeStore().save(trackedTime)

    expect(await createBrowserTrackedTimeStore().load()).toEqual(trackedTime)
  })
})

describe('the browser repeat day result store', () => {
  test('an empty storage loads as no repeat day results', async () => {
    expect(await createBrowserRepeatDayResultStore().load()).toEqual({})
  })

  test('saved repeat day results load back, also in a store created later', async () => {
    const results = { gym: { '2026-11-16': { planned: 3_600_000, tracked: 2_400_000, finished: false } } }

    await createBrowserRepeatDayResultStore().save(results)

    expect(await createBrowserRepeatDayResultStore().load()).toEqual(results)
  })
})
