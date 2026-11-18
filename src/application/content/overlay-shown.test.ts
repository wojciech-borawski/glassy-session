import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createFocusSession, pin as pinSession } from '@/domain/session/model/focus-session'
import { createTimer, pin } from '@/domain/timer/model/timer'
import { createBrowserOverlaySettings } from '@/infrastructure/browser/overlay-settings'
import { createBrowserSessionStore } from '@/infrastructure/browser/session-store'
import { createBrowserTimerStore } from '@/infrastructure/browser/timer-store'
import { followOverlayShown } from './overlay-shown'

const MINUTE = 60_000

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: [], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, [])

beforeEach(() => {
  fakeBrowser.reset()
})

/** Follows whether the overlay shows, and gives every answer so far. */
function follow() {
  const answers: boolean[] = []
  const stop = followOverlayShown((shown) => answers.push(shown))
  return { answers, stop }
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 10))

describe('whether the overlay shows on a page', () => {
  test('it does not while nothing is pinned, and does once a timer is pinned', async () => {
    await createBrowserTimerStore().save([tea])
    const { answers } = follow()
    await settled()

    await createBrowserTimerStore().save([pin(tea).timer])
    await settled()

    expect(answers).toEqual([false, true])
  })

  test('it does once a focus session is pinned', async () => {
    await createBrowserSessionStore().save([pinSession(morning)])
    const { answers } = follow()
    await settled()

    expect(answers).toEqual([true])
  })

  test('it does not while the overlay is switched off, though something is pinned, and does again once it is switched on', async () => {
    await createBrowserTimerStore().save([pin(tea).timer])
    const settings = createBrowserOverlaySettings()
    await settings.change({ shownOnPages: false })
    const { answers } = follow()
    await settled()

    await settings.change({ shownOnPages: true })
    await settled()

    expect(answers).toEqual([false, true])
  })

  test('it tells nothing more once following stops', async () => {
    const { answers, stop } = follow()
    await settled()

    stop()
    await createBrowserTimerStore().save([pin(tea).timer])
    await settled()

    expect(answers).toEqual([false])
  })
})
