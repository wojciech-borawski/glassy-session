import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createFocusSession, type FocusSession } from '@/domain/session/model/focus-session'
import { createBrowserSessionStore, readStoredSessions, watchStoredSessions } from './session-store'

beforeEach(() => {
  fakeBrowser.reset()
})

const morning = createFocusSession(
  { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 1_500_000, breakLength: 300_000, order: 'one after another' },
  [{ taskId: 'write-report', remainingTime: 3_000_000 }]
)

describe('the browser session store', () => {
  test('an empty storage loads as no focus sessions', async () => {
    expect(await createBrowserSessionStore().load()).toEqual([])
  })

  test('saved focus sessions load back, also in a store created later', async () => {
    const running = { ...morning, id: 'evening', run: { plan: morning.plan, position: 0, delay: 0, since: 1_000, paused: false } }

    await createBrowserSessionStore().save([morning, running])

    expect(await createBrowserSessionStore().load()).toEqual([morning, running])
  })

  test('other contexts read the focus sessions the background saved', async () => {
    await createBrowserSessionStore().save([morning])

    expect(await readStoredSessions()).toEqual([morning])
  })

  test('a watcher hears each save until it stops watching', async () => {
    const heard: (readonly FocusSession[])[] = []
    const stopWatching = watchStoredSessions((sessions) => heard.push(sessions))

    await createBrowserSessionStore().save([morning])
    stopWatching()
    await createBrowserSessionStore().save([])

    expect(heard).toEqual([[morning]])
  })
})
