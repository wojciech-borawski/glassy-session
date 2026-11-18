import { fakeBrowser } from 'wxt/testing/fake-browser'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { runEngines } from './run-engines'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const

beforeEach(async () => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
  await runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

/** The badge on the toolbar button once the background, which does not wait for it, has shown it. */
async function badgeText(expected: string) {
  await vi.waitFor(async () => expect(await browser.action.getBadgeText({})).toBe(expected))
}

describe('the background showing the toolbar badge', () => {
  test('a start command shows the timer on the badge', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })

    await sendTimerCommand({ type: 'start', timerId: 'tea' })

    await badgeText('1')
  })

  test('the wake alarm going off after the timer ran out takes the badge away', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    await badgeText('1')
    vi.setSystemTime(NINE + 3 * MINUTE)

    for (const alarm of await browser.alarms.getAll()) {
      await fakeBrowser.alarms.onAlarm.trigger(alarm)
    }

    await badgeText('')
  })

  test('the browser starting shows the badge again for a timer that still runs', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    await badgeText('1')
    await browser.action.setBadgeText({ text: '' })
    vi.setSystemTime(NINE + MINUTE)

    await fakeBrowser.runtime.onStartup.trigger()

    await badgeText('1')
  })

  test('the background starting again without the browser starting, as when the extension is switched off and on, shows the badge for a timer that still runs', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    await badgeText('1')
    await browser.action.setBadgeText({ text: '' })
    vi.setSystemTime(NINE + MINUTE)

    await runEngines()

    await badgeText('1')
  })

  test('a badge the browser refuses to show is logged, and the command answers as done', async () => {
    const refused = new Error('No toolbar button')
    vi.spyOn(browser.action, 'setBadgeText').mockRejectedValue(refused)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendTimerCommand({ type: 'add', timer: tea })

    const refusal = await sendTimerCommand({ type: 'start', timerId: 'tea' })

    expect(refusal).toBeNull()
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledWith(refused))
  })
})
