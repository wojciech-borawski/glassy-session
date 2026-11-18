import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h, shallowRef } from 'vue'
import { createAlarm, type Alarm } from '@/domain/alarm/model/alarm'
import type { StoredAlarms } from '@/domain/alarm/ports'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideSounds } from '@/domain/sound/sounds'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { provideStoredTrackedTime } from '@/domain/tracking/stored-tracked-time'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createMemoryStoredAlarms } from '@/infrastructure/memory/stored-alarms'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PopupShell from './popup-shell.vue'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Tuesday 17 November 2026, 09:00 on the local clock. */
const TUESDAY_NINE = new Date(2026, 10, 17, 9).getTime()

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const lunch = createAlarm({ id: 'lunch', name: 'Lunch', time: 13 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: false })

function renderShell(alarms: readonly Alarm[], path = '/alarms', port?: StoredAlarms) {
  window.location.hash = `#${path}`
  const clock = createManualClock(TUESDAY_NINE)
  const storedAlarms = port ?? createMemoryStoredAlarms({ now: () => clock.now.value, alarms })
  const background = createMemoryBackground({ now: () => clock.now.value })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideStoredAlarms(storedAlarms)
      provideStoredPlaylists(createMemoryStoredPlaylists())
      provideDisplayClock(clock.now)
      provideSounds(createMemorySounds())
      provideSnackbar()
      return () => h(PopupShell)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return { clock, storedAlarms }
}

describe('the Alarms view', () => {
  test('lists every stored alarm', async () => {
    renderShell([wakeUp, lunch])

    const section = await screen.findByRole('region', { name: 'All alarms' })
    expect(within(section).getByRole('article', { name: 'Wake up' })).toBeInTheDocument()
    expect(within(section).getByRole('article', { name: 'Lunch' })).toBeInTheDocument()
  })

  test('New opens the dialog, and saving adds the alarm, says so and closes the dialog', async () => {
    const { storedAlarms } = renderShell([])
    expect(await screen.findByText('No alarms yet. Choose New to add one.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'New' }))
    await userEvent.type(within(screen.getByRole('dialog', { name: 'New alarm' })).getByRole('textbox', { name: 'Name' }), 'Wake up{Enter}')

    expect(await screen.findByRole('article', { name: 'Wake up' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Wake up added')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedAlarms.alarms.value).toEqual([expect.objectContaining({ name: 'Wake up', time: 8 * HOUR, switchedOn: true })])
  })

  test('Edit opens the dialog filled in, and saving changes the alarm and says so', async () => {
    const { storedAlarms } = renderShell([wakeUp, lunch])

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Lunch' }))
    const name = within(screen.getByRole('dialog', { name: 'Edit alarm' })).getByRole('textbox', { name: 'Name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Long lunch{Enter}')

    expect(await screen.findByRole('article', { name: 'Long lunch' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Long lunch saved')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedAlarms.alarms.value.map(({ name }) => name)).toEqual(['Wake up', 'Long lunch'])
  })

  test('Delete in the dialog removes the alarm and says so', async () => {
    renderShell([wakeUp, lunch])

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Lunch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Lunch' }))

    await vi.waitFor(() => expect(screen.queryByRole('article', { name: 'Lunch' })).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Lunch removed')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the switch on a card switches the alarm off and on again, saying so each time', async () => {
    renderShell([wakeUp])
    const ringSwitch = await screen.findByRole('switch', { name: 'Ring Wake up' })

    await userEvent.click(ringSwitch)
    await vi.waitFor(() => expect(ringSwitch).toHaveAttribute('aria-checked', 'false'))
    expect(screen.getByRole('status')).toHaveTextContent('Wake up switched off')
    await userEvent.click(ringSwitch)

    await vi.waitFor(() => expect(ringSwitch).toHaveAttribute('aria-checked', 'true'))
    expect(screen.getByRole('status')).toHaveTextContent('Wake up switched on')
  })

  test('a refused save keeps the dialog open with what was filled in, and says why', async () => {
    const refusing: StoredAlarms = { alarms: shallowRef([]), send: async () => ({ reason: 'failed', message: 'Storage is full' }) }
    renderShell([], '/alarms', refusing)

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up{Enter}')

    expect(await screen.findByText('That did not work: Storage is full')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Wake up')
  })
})

describe('the Today view', () => {
  test('shows the alarms still to ring today before the timers and tasks', async () => {
    renderShell([wakeUp, lunch], '/')

    const alarmsToday = await screen.findByRole('region', { name: 'Alarms today' })
    expect(within(alarmsToday).getAllByRole('listitem').map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['13:00 Lunch'])
    const timersAndTasks = screen.getByRole('region', { name: 'Timers and tasks' })
    expect(alarmsToday.compareDocumentPosition(timersAndTasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('the Alarms view by keyboard', () => {
  /** Presses Tab until the element named has focus, and fails when it is not reached within forty presses. */
  async function tabTo(role: 'button' | 'switch' | 'textbox', name: string) {
    const target = await screen.findByRole(role, { name })
    for (let presses = 0; presses < 40 && document.activeElement !== target; presses++) {
      await userEvent.tab()
    }
    expect(target).toHaveFocus()
  }

  test('adds an alarm, switches it off and opens it for editing with the keyboard alone', async () => {
    const { storedAlarms } = renderShell([])

    await tabTo('button', 'New')
    await userEvent.keyboard('{Enter}')
    await tabTo('textbox', 'Name')
    await userEvent.keyboard('Wake up{Enter}')
    await screen.findByRole('article', { name: 'Wake up' })
    await tabTo('switch', 'Ring Wake up')
    await userEvent.keyboard(' ')
    await vi.waitFor(() => expect(storedAlarms.alarms.value).toEqual([expect.objectContaining({ name: 'Wake up', switchedOn: false })]))
    await tabTo('button', 'Edit Wake up')
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('dialog', { name: 'Edit alarm' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

