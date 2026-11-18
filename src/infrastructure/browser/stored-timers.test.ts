import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createTimer } from '@/domain/timer/model/timer'
import { createBrowserStoredTimers } from './stored-timers'
import { createBrowserTimerStore } from './timer-store'

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' } })
const nap = createTimer({ id: 'nap', name: 'Nap', kind: 'timer', plannedTime: 1_200_000, appearance: { colour: 'violet' } })

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored timers as the browser keeps them', () => {
  test('the timers are those in storage, first as read and then after each save', async () => {
    await createBrowserTimerStore().save([tea])
    const stored = createBrowserStoredTimers()

    await vi.waitFor(() => expect(stored.timers.value).toEqual([tea]))
    await createBrowserTimerStore().save([tea, nap])

    await vi.waitFor(() => expect(stored.timers.value).toEqual([tea, nap]))
  })

  test('a save made while the first read is under way is not overwritten by what that read found', async () => {
    const stored = createBrowserStoredTimers()

    await createBrowserTimerStore().save([nap])
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored.timers.value).toEqual([nap])
  })

  test('a command goes to the background as a message and resolves with the background\'s answer', async () => {
    const received: unknown[] = []
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      received.push(message)
      sendResponse({ refusal: null })
      return true
    })
    const stored = createBrowserStoredTimers()

    const refusal = await stored.send({ type: 'start', timerId: 'tea' })

    expect(refusal).toBeNull()
    expect(received).toEqual([{ type: 'start', timerId: 'tea' }])
  })

  test('stops following storage when the scope it was created in ends', async () => {
    const scope = effectScope()
    const stored = scope.run(() => createBrowserStoredTimers())
    await createBrowserTimerStore().save([nap])
    await vi.waitFor(() => expect(stored?.timers.value).toEqual([nap]))

    scope.stop()
    await createBrowserTimerStore().save([tea])
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(stored?.timers.value).toEqual([nap])
  })
})
