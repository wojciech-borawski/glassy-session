import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { runStateAt } from '@/domain/timer/model/timer'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { readStoredTimers } from '@/infrastructure/browser/timer-store'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { runEngines } from '../background/run-engines'
import App from './app.vue'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } } as const

beforeEach(async () => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
  await runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPopup() {
  window.location.hash = '#/'
  return render(App, { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
}

describe('the popup with the real background', () => {
  test('a task added and started in the popup is stored by the background, and the popup shows what was stored', async () => {
    renderPopup()

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Write report{Enter}')
    const card = await screen.findByRole('article', { name: 'Write report' })
    expect(screen.getByRole('status')).toHaveTextContent('Write report added')
    await userEvent.click(within(card).getByRole('button', { name: 'Start Write report' }))
    await screen.findByRole('region', { name: 'Counting down' })

    const [stored] = await readStoredTimers()
    expect(stored).toMatchObject({ name: 'Write report', kind: 'task', plannedTime: 25 * MINUTE })
    expect(runStateAt(stored!, NINE + MINUTE)).toBe('running')
    expect((await browser.alarms.getAll()).map(({ scheduledTime }) => scheduledTime)).toEqual([NINE + 25 * MINUTE])
    expect(screen.getByRole('status')).toHaveTextContent('Write report started')
  })

  test('a timer changed by another part of the extension changes in the open popup as well', async () => {
    await sendTimerCommand({ type: 'add', timer: tea })
    renderPopup()
    const card = await screen.findByRole('article', { name: 'Tea' })

    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    expect(await within(card).findByRole('button', { name: 'Pause Tea' })).toBeInTheDocument()
    await sendTimerCommand({ type: 'remove', timerId: 'tea' })

    await vi.waitFor(() => expect(screen.queryByRole('article', { name: 'Tea' })).not.toBeInTheDocument())
    expect(screen.getByText('No timers or tasks yet. Choose New to add one.')).toBeInTheDocument()
  })
})
