import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import type { SavedMusic } from '@/domain/music/ports'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { createFocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { provideSounds } from '@/domain/sound/sounds'
import { createTimer } from '@/domain/timer/model/timer'
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
const NINE = Date.UTC(2026, 10, 17, 9)

const pasta = createTimer({ id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'gold' } })
const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, [])

const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [] }
const rainyDay = { id: 'rainy-day', name: 'Rainy day', files: [] }

function renderPopup(place: string, music: SavedMusic = { playlists: [focusMix, rainyDay], backgroundSounds: [] }) {
  window.location.hash = `#${place}`
  const clock = createManualClock(NINE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers: [pasta, writeReport], sessions: [morning] })
  const storedPlaylists = createMemoryStoredPlaylists(music)
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideStoredAlarms(createMemoryStoredAlarms({ now: () => clock.now.value }))
      provideStoredPlaylists(storedPlaylists)
      provideDisplayClock(clock.now)
      provideSounds(createMemorySounds())
      provideSnackbar()
      return () => h(PopupShell)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return { storedPlaylists, background }
}

const soundFields = (dialog: HTMLElement) => {
  const group = within(dialog).getByRole('group', { name: 'Background sound' })
  return { playlist: within(group).getByRole('combobox', { name: 'Playlist' }), volume: within(group).getByRole('slider', { name: 'Volume' }) }
}

const statusLines = () => Array.from(screen.getByRole('status').children, (line) => line.textContent?.trim())

describe('choosing the background sound of a timer', () => {
  test('the dialog shows the sound the timer chose, and a new choice is kept when the timer is saved and said in the snackbar', async () => {
    const { storedPlaylists } = renderPopup('/timers', {
      playlists: [focusMix, rainyDay],
      backgroundSounds: [{ owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'rainy-day', volume: 0.5 } }]
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit timer' })
    const { playlist, volume } = soundFields(dialog)
    expect(playlist).toHaveDisplayValue('Rainy day')
    expect(volume).toHaveValue('50')
    await userEvent.selectOptions(playlist, 'Focus mix')
    await fireEvent.update(volume, '30')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['Pasta saved', 'Pasta plays Focus mix at 30%']))
    expect(storedPlaylists.backgroundSounds.value).toEqual([{ owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }])
  })

  test('a timer saved with its sound unchanged sends no sound command', async () => {
    const { storedPlaylists } = renderPopup('/timers')
    const sent = vi.spyOn(storedPlaylists, 'send')

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Edit timer' })).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['Pasta saved']))
    expect(sent).not.toHaveBeenCalled()
  })

  test('a sound chosen and then cancelled is not kept, and the dialog shows the stored one when opened again', async () => {
    const { storedPlaylists } = renderPopup('/timers')

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    let dialog = await screen.findByRole('dialog', { name: 'Edit timer' })
    await userEvent.selectOptions(soundFields(dialog).playlist, 'Focus mix')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    dialog = await screen.findByRole('dialog', { name: 'Edit timer' })

    expect(soundFields(dialog).playlist).toHaveDisplayValue('None')
    expect(storedPlaylists.backgroundSounds.value).toEqual([])
  })

  test('a sound chosen for a timer whose save is refused is not sent', async () => {
    const { storedPlaylists, background } = renderPopup('/timers')

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit timer' })
    await userEvent.selectOptions(soundFields(dialog).playlist, 'Focus mix')
    await background.storedTimers.send({ type: 'remove', timerId: 'pasta' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['It was already removed']))
    expect(storedPlaylists.backgroundSounds.value).toEqual([])
  })

  test('a new timer keeps the sound chosen in its dialog', async () => {
    const { storedPlaylists, background } = renderPopup('/timers')

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    const dialog = await screen.findByRole('dialog', { name: 'New task' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Read')
    await userEvent.selectOptions(soundFields(dialog).playlist, 'Rainy day')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['Read added', 'Read plays Rainy day at 50%']))
    const read = background.storedTimers.timers.value.find(({ name }) => name === 'Read')
    expect(storedPlaylists.backgroundSounds.value).toEqual([{ owner: { of: 'timer', id: read?.id }, sound: { playlistId: 'rainy-day', volume: 0.5 } }])
  })
})

describe('choosing the background sound of a focus session', () => {
  test('the dialog shows the sound the session chose, and a new choice is kept when the session is saved', async () => {
    const { storedPlaylists } = renderPopup('/focus-sessions')

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Morning' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit focus session' })
    expect(soundFields(dialog).playlist).toHaveDisplayValue('None')
    await userEvent.selectOptions(soundFields(dialog).playlist, 'Focus mix')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['Morning saved', 'Morning plays Focus mix at 50%']))
    expect(storedPlaylists.backgroundSounds.value).toEqual([{ owner: { of: 'focus session', id: 'morning' }, sound: { playlistId: 'focus-mix', volume: 0.5 } }])
  })

  test('a new focus session keeps the sound chosen in its dialog', async () => {
    const { storedPlaylists, background } = renderPopup('/focus-sessions')

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    const dialog = await screen.findByRole('dialog', { name: 'New focus session' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Evening')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Write report/ }))
    await userEvent.selectOptions(soundFields(dialog).playlist, 'Rainy day')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(statusLines()).toEqual(['Evening added', 'Evening plays Rainy day at 50%']))
    const evening = background.storedSessions.sessions.value.find(({ name }) => name === 'Evening')
    expect(storedPlaylists.backgroundSounds.value).toEqual([{ owner: { of: 'focus session', id: evening?.id }, sound: { playlistId: 'rainy-day', volume: 0.5 } }])
  })
})
