import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { readStoredAlarms } from '@/infrastructure/browser/alarm-store'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { runEngines } from '../background/run-engines'
import App from './app.vue'

/** Tuesday 17 November 2026, 09:00 on the local clock. */
const TUESDAY_NINE = new Date(2026, 10, 17, 9).getTime()

beforeEach(async () => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TUESDAY_NINE)
  await runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPopup() {
  window.location.hash = '#/alarms'
  return render(App, { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
}

async function fireAllAlarms() {
  for (const alarm of await browser.alarms.getAll()) {
    await fakeBrowser.alarms.onAlarm.trigger(alarm)
  }
}

function shownNotifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

/** Adds a one-time alarm for today at the time given, through the dialog. */
async function addOneTimeAlarm(name: string, time: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'New' }))
  const dialog = screen.getByRole('dialog', { name: 'New alarm' })
  await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), name)
  const timeField = within(dialog).getByLabelText('Time')
  await userEvent.clear(timeField)
  await userEvent.type(timeField, time)
  await userEvent.click(within(dialog).getByRole('button', { name: 'Once' }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
  return screen.findByRole('article', { name })
}

describe('alarms in the popup with the real background', () => {
  test('a one-time alarm added in the popup rings once at its moment, and the popup then shows it switched off', async () => {
    renderPopup()
    const card = await addOneTimeAlarm('Dentist', '09:30')
    expect(within(card).getByRole('switch', { name: 'Ring Dentist' })).toBeChecked()

    vi.setSystemTime(new Date(2026, 10, 17, 9, 30, 1))
    await fireAllAlarms()
    await fireAllAlarms()

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Dentist', message: 'It is 09:30.' })])
    await vi.waitFor(() => expect(within(card).getByRole('switch', { name: 'Ring Dentist' })).not.toBeChecked())
    expect(await readStoredAlarms()).toEqual([expect.objectContaining({ name: 'Dentist', switchedOn: false })])
    expect(await browser.alarms.getAll()).toEqual([])
  })

  test('a one-time alarm due while the browser was closed is told as missed once, quietly, when it starts, and the popup shows it switched off', async () => {
    renderPopup()
    const card = await addOneTimeAlarm('Dentist', '09:30')

    vi.setSystemTime(new Date(2026, 10, 17, 12))
    await fakeBrowser.runtime.onStartup.trigger()
    await fakeBrowser.runtime.onStartup.trigger()
    await fireAllAlarms()

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Dentist', message: 'Missed: it was due at 09:30 on Tuesday, November 17.', silent: true })])
    await vi.waitFor(() => expect(within(card).getByRole('switch', { name: 'Ring Dentist' })).not.toBeChecked())
    expect(await browser.alarms.getAll()).toEqual([])
  })
})
