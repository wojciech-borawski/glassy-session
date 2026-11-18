import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createTimer, type Timer } from '@/domain/timer/model/timer'
import { createBrowserTimerStore, readStoredTimers, watchStoredTimers } from './timer-store'

beforeEach(() => {
  fakeBrowser.reset()
})

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' } })

describe('the browser timer store', () => {
  test('an empty storage loads as no timers', async () => {
    expect(await createBrowserTimerStore().load()).toEqual([])
  })

  test('saved timers load back in the order they were saved, also in a store created later', async () => {
    const writeReport = { ...createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 1_500_000, appearance: { colour: 'blue' } }), runningSince: 1_000 }

    await createBrowserTimerStore().save([tea, writeReport])

    expect(await createBrowserTimerStore().load()).toEqual([tea, writeReport])
  })

  test('other contexts read the timers the background saved', async () => {
    await createBrowserTimerStore().save([tea])

    expect(await readStoredTimers()).toEqual([tea])
  })

  test('a watcher hears each save with the timers saved', async () => {
    const heard: (readonly Timer[])[] = []
    watchStoredTimers((timers) => heard.push(timers))

    await createBrowserTimerStore().save([tea])

    expect(heard).toEqual([[tea]])
  })

  test('a watcher that stopped watching hears no more saves', async () => {
    const heard: (readonly Timer[])[] = []
    const stopWatching = watchStoredTimers((timers) => heard.push(timers))

    stopWatching()
    await createBrowserTimerStore().save([tea])

    expect(heard).toEqual([])
  })
})
