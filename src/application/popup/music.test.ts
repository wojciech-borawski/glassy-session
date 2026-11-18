import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import type { SavedMusic } from '@/domain/music/ports'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { createFocusSession, type FocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { provideSounds } from '@/domain/sound/sounds'
import { createTimer, type Timer } from '@/domain/timer/model/timer'
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

const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }] }
const rainyDay = { id: 'rainy-day', name: 'Rainy day', files: [] }

function renderMusic(music: SavedMusic = { playlists: [], backgroundSounds: [] }, timers: readonly Timer[] = [pasta, writeReport], sessions: readonly FocusSession[] = [morning]) {
  window.location.hash = '#/music'
  const clock = createManualClock(NINE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, sessions })
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
  return { storedPlaylists }
}

describe('the Music place', () => {
  test('lists every stored playlist as a card, naming the timers and focus sessions that chose it', async () => {
    renderMusic({
      playlists: [focusMix, rainyDay],
      backgroundSounds: [
        { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } },
        { owner: { of: 'focus session', id: 'morning' }, sound: { playlistId: 'focus-mix', volume: 0.5 } },
        { owner: { of: 'timer', id: 'write-report' }, sound: { playlistId: null, volume: 0.5 } }
      ]
    })

    const section = await screen.findByRole('region', { name: 'Playlists' })
    const [first, second, ...others] = within(section).getAllByRole('article')
    expect(first).toHaveAccessibleName('Focus mix')
    expect(within(first!).getByText('Used by Pasta, Morning')).toBeInTheDocument()
    expect(second).toHaveAccessibleName('Rainy day')
    expect(within(second!).getByText('Not used yet')).toBeInTheDocument()
    expect(others).toEqual([])
  })

  test('says what a playlist is and how to use it when there are none', async () => {
    renderMusic()

    const section = await screen.findByRole('region', { name: 'Playlists' })
    expect(within(section).getByText('A playlist is one or more of your own audio files. Add one here, then choose it on a timer, a task or a focus session.')).toBeInTheDocument()
  })

  test('New adds a playlist with the next free number in its name, says so, and puts the cursor in its name field to rename it', async () => {
    const { storedPlaylists } = renderMusic({ playlists: [{ ...rainyDay, name: 'Playlist 1' }], backgroundSounds: [] })

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))

    expect(await screen.findByRole('textbox', { name: 'Name of Playlist 2' })).toHaveFocus()
    expect(storedPlaylists.playlists.value.map(({ name }) => name)).toEqual(['Playlist 1', 'Playlist 2'])
    expect(screen.getByRole('status')).toHaveTextContent('Playlist 2 added')
  })
})

describe('changing playlists in the Music place', () => {
  const waves = { id: 'waves', name: 'waves.ogg', length: 240_000 }
  const twoFiles = { ...focusMix, files: [...focusMix.files, waves] }
  const card = async (name: string) => within(await screen.findByRole('region', { name: 'Playlists' })).getByRole('article', { name })

  test('a name typed on a card renames the playlist and says so', async () => {
    const { storedPlaylists } = renderMusic({ playlists: [focusMix], backgroundSounds: [] })
    const field = within(await card('Focus mix')).getByRole('textbox', { name: 'Name of Focus mix' })

    await userEvent.clear(field)
    await userEvent.type(field, 'Deep focus{Enter}')

    expect(await screen.findByRole('article', { name: 'Deep focus' })).toBeInTheDocument()
    expect(storedPlaylists.playlists.value.map(({ name }) => name)).toEqual(['Deep focus'])
    expect(screen.getByRole('status')).toHaveTextContent('Focus mix renamed to Deep focus')
  })

  test('deleting a playlist says how many timers and focus sessions chose it and now have no background sound', async () => {
    const { storedPlaylists } = renderMusic({
      playlists: [focusMix, rainyDay],
      backgroundSounds: [
        { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } },
        { owner: { of: 'timer', id: 'write-report' }, sound: { playlistId: 'focus-mix', volume: 0.5 } },
        { owner: { of: 'focus session', id: 'morning' }, sound: { playlistId: 'focus-mix', volume: 0.5 } },
        { owner: { of: 'timer', id: 'removed-timer' }, sound: { playlistId: 'focus-mix', volume: 0.5 } }
      ]
    })

    await userEvent.click(within(await card('Focus mix')).getByRole('button', { name: 'Delete Focus mix' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Focus mix deleted. 2 timers and 1 focus session now have no background sound.')
    expect(screen.queryByRole('article', { name: 'Focus mix' })).not.toBeInTheDocument()
    expect(storedPlaylists.playlists.value.map(({ id }) => id)).toEqual(['rainy-day'])
  })

  test('audio files chosen on a card are kept and added to its playlist, and a file that is not audio is named in the snackbar', async () => {
    const { storedPlaylists } = renderMusic({ playlists: [rainyDay], backgroundSounds: [] })

    await userEvent.upload(within(await card('Rainy day')).getByLabelText('Choose audio files for Rainy day'), [
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
      new File(['birds'], 'birds.wav', { type: 'audio/wav' })
    ])

    expect(await within(await card('Rainy day')).findByText('birds.wav')).toBeInTheDocument()
    expect(storedPlaylists.playlists.value[0]?.files.map(({ name }) => name)).toEqual(['birds.wav'])
    expect(screen.getByRole('status')).toHaveTextContent('1 file added to Rainy day')
  })

  test('a file moved on a card changes its place in the playlist and says where it went', async () => {
    const { storedPlaylists } = renderMusic({ playlists: [twoFiles], backgroundSounds: [] })

    await userEvent.click(within(await card('Focus mix')).getByRole('button', { name: 'Move waves.ogg earlier' }))

    expect(await screen.findByRole('status')).toHaveTextContent('waves.ogg moved to place 1 in Focus mix')
    expect(storedPlaylists.playlists.value[0]?.files.map(({ id }) => id)).toEqual(['waves', 'rain'])
  })

  test('a file removed on a card leaves the playlist and the snackbar says so', async () => {
    const { storedPlaylists } = renderMusic({ playlists: [twoFiles], backgroundSounds: [] })

    await userEvent.click(within(await card('Focus mix')).getByRole('button', { name: 'Remove rain.mp3 from Focus mix' }))

    expect(await screen.findByRole('status')).toHaveTextContent('rain.mp3 removed from Focus mix')
    expect(storedPlaylists.playlists.value[0]?.files.map(({ id }) => id)).toEqual(['waves'])
  })
})

describe('a whole round with a playlist', () => {
  const lastLine = () => screen.getByRole('status').lastElementChild?.textContent?.trim()
  const goTo = (place: string) => userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: place }))
  const soundOfPasta = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Pasta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit timer' })
    const group = within(dialog).getByRole('group', { name: 'Background sound' })
    return { dialog, playlist: within(group).getByRole('combobox', { name: 'Playlist' }), volume: within(group).getByRole('slider', { name: 'Volume' }) }
  }

  test('makes a playlist of two files, reorders them, gives it to a timer at 30%, deletes it, and the timer then has none at the same volume', async () => {
    const { storedPlaylists } = renderMusic()

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    await userEvent.clear(await screen.findByRole('textbox', { name: 'Name of Playlist 1' }))
    await userEvent.keyboard('Focus mix{Enter}')
    await vi.waitFor(() => expect(lastLine()).toBe('Playlist 1 renamed to Focus mix'))

    const card = await screen.findByRole('article', { name: 'Focus mix' })
    await userEvent.upload(within(card).getByLabelText('Choose audio files for Focus mix'), [
      new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' }),
      new File(['waves'], 'waves.ogg', { type: 'audio/ogg' })
    ])
    await vi.waitFor(() => expect(lastLine()).toBe('2 files added to Focus mix'))

    await userEvent.click(within(card).getByRole('button', { name: 'Move waves.ogg earlier' }))
    await vi.waitFor(() => expect(lastLine()).toBe('waves.ogg moved to place 1 in Focus mix'))
    expect(within(within(card).getByRole('list', { name: 'Files in Focus mix' })).getAllByRole('listitem').map((row) => within(row).getAllByText(/./).map((part) => part.textContent))).toEqual([
      ['1', 'waves.ogg', '03:00'],
      ['2', 'rain.mp3', '03:00']
    ])

    await goTo('Timers')
    const chosen = await soundOfPasta()
    await userEvent.selectOptions(chosen.playlist, 'Focus mix')
    await fireEvent.update(chosen.volume, '30')
    await userEvent.click(within(chosen.dialog).getByRole('button', { name: 'Save' }))
    await vi.waitFor(() => expect(lastLine()).toBe('Pasta plays Focus mix at 30%'))

    await goTo('Music')
    const used = await screen.findByRole('article', { name: 'Focus mix' })
    expect(within(used).getByText('Used by Pasta')).toBeInTheDocument()
    await userEvent.click(within(used).getByRole('button', { name: 'Delete Focus mix' }))
    await vi.waitFor(() => expect(lastLine()).toBe('Focus mix deleted. 1 timer now has no background sound.'))
    expect(storedPlaylists.playlists.value).toEqual([])

    await goTo('Timers')
    const after = await soundOfPasta()
    expect(after.playlist).toHaveDisplayValue('None')
    expect(after.volume).toHaveValue('30')
  })
})
