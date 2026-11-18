import { render, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { isPinned, runStateAt } from '@/domain/timer/model/timer'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { readStoredTimers } from '@/infrastructure/browser/timer-store'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { runEngines } from '../background/run-engines'
import PopupApp from '../popup/app.vue'
import OverlayApp from './app.vue'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

beforeEach(() => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
  runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPopup() {
  window.location.hash = '#/timers'
  const container = document.body.appendChild(document.createElement('div'))
  render(PopupApp, { container, global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return container
}

function renderOverlayOnAPage() {
  const container = document.body.appendChild(document.createElement('div'))
  render(OverlayApp, { container, global: { plugins: [createAppI18n()], config: { idPrefix: 'overlay' } } })
  return container
}

describe('the overlay on a web page with the popup and the real background', () => {
  test('a timer pinned in the popup shows in the overlay, starts from there, runs in the popup too, and leaves the overlay when unpinned', async () => {
    await sendTimerCommand({ type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } } })
    const popup = renderPopup()
    const page = renderOverlayOnAPage()
    const card = await within(popup).findByRole('article', { name: 'Tea' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(within(page).queryByRole('region', { name: 'Pinned timers and focus sessions' })).not.toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Pin Tea to the overlay' }))
    const overlay = await within(page).findByRole('region', { name: 'Pinned timers and focus sessions' })
    expect(within(overlay).getByRole('listitem', { name: 'Tea' })).toHaveTextContent('04:00')
    await userEvent.click(within(overlay).getByRole('button', { name: 'Start Tea' }))

    expect(await within(card).findByRole('button', { name: 'Pause Tea' })).toBeInTheDocument()
    expect(within(overlay).getByRole('status')).toHaveTextContent('Tea started')
    expect(within(popup).getByRole('region', { name: 'Counting down' })).toHaveTextContent('Tea')
    const [stored] = await readStoredTimers()
    expect(runStateAt(stored!, NINE + MINUTE)).toBe('running')
    expect(isPinned(stored!)).toBe(true)

    await userEvent.click(within(card).getByRole('button', { name: 'Pin Tea to the overlay' }))

    await vi.waitFor(() => expect(within(page).queryByRole('region', { name: 'Pinned timers and focus sessions' })).not.toBeInTheDocument())
    expect(isPinned((await readStoredTimers())[0]!)).toBe(false)
  })
})
