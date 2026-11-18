import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createFocusSession } from '@/domain/session/model/focus-session'
import { createBrowserSessionStore } from './session-store'
import { createBrowserStoredSessions } from './stored-sessions'

const MINUTE = 60_000

const settings = { taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' } as const
const tasks = [{ taskId: 'write-report', remainingTime: 50 * MINUTE }]
const morning = createFocusSession({ id: 'morning', name: 'Morning', ...settings }, tasks)
const evening = createFocusSession({ id: 'evening', name: 'Evening', ...settings }, tasks)

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored focus sessions as the browser keeps them', () => {
  test('the focus sessions are those in storage, first as read and then after each save', async () => {
    await createBrowserSessionStore().save([morning])
    const stored = createBrowserStoredSessions()

    await vi.waitFor(() => expect(stored.sessions.value).toEqual([morning]))
    await createBrowserSessionStore().save([morning, evening])

    await vi.waitFor(() => expect(stored.sessions.value).toEqual([morning, evening]))
  })

  test('a save made while the first read is under way is not overwritten by what that read found', async () => {
    const stored = createBrowserStoredSessions()

    await createBrowserSessionStore().save([evening])
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored.sessions.value).toEqual([evening])
  })

  test('stops following storage when the scope it was created in ends', async () => {
    const scope = effectScope()
    const stored = scope.run(() => createBrowserStoredSessions())
    await createBrowserSessionStore().save([evening])
    await vi.waitFor(() => expect(stored?.sessions.value).toEqual([evening]))

    scope.stop()
    await createBrowserSessionStore().save([morning])
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored?.sessions.value).toEqual([evening])
  })

  test('a command goes to the background as a message and resolves with what the background answers', async () => {
    const received: unknown[] = []
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      received.push(message)
      sendResponse({ refusal: null })
      return true
    })
    const stored = createBrowserStoredSessions()

    const refusal = await stored.send({ type: 'start', sessionId: 'morning' })

    expect(refusal).toBeNull()
    expect(received).toEqual([{ type: 'start', sessionId: 'morning' }])
  })
})
