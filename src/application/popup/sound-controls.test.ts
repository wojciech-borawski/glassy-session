import { render, screen, within } from '@testing-library/vue'
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
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PopupShell from './popup-shell.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const pasta = createTimer({ id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'gold' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'green' } })
const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, [{ taskId: 'write-report', remainingTime: 50 * MINUTE }])

const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }, { id: 'waves', name: 'waves.ogg', length: 240_000 }] }
const music: SavedMusic = {
  playlists: [focusMix],
  backgroundSounds: [
    { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.6 } },
    { owner: { of: 'focus session', id: 'morning' }, sound: { playlistId: 'focus-mix', volume: 0.4 } }
  ]
}

function renderPopup(place: string) {
  window.location.hash = `#${place}`
  const clock = createManualClock(NINE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers: [pasta, tea, writeReport], sessions: [morning], music })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideStoredAlarms(createMemoryStoredAlarms({ now: () => clock.now.value }))
      provideStoredPlaylists(background.storedPlaylists)
      provideDisplayClock(clock.now)
      provideSounds(createMemorySounds())
      provideSnackbar()
      return () => h(PopupShell)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return background
}

const runningBar = () => screen.getByRole('region', { name: 'Counting down' })
const card = (name: string) => screen.getByRole('article', { name })

describe('the sound controls in the popup', () => {
  test('a timer that plays its background sound shows them on its chip in the running bar, with the volume behind a button there, and on its card, and a running timer without one shows none', async () => {
    const background = renderPopup('/timers')
    await userEvent.click(await screen.findByRole('button', { name: 'Start Tea' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start Pasta' }))

    const chip = within(runningBar()).getByText('Pasta').closest('li')!
    expect(within(chip).getByRole('group', { name: 'Background sound of Pasta' })).toBeInTheDocument()
    expect(within(chip).queryByRole('slider')).toBeNull()
    await userEvent.click(within(chip).getByRole('button', { name: 'Show the volume of Pasta' }))
    expect(within(chip).getByRole('slider', { name: 'Volume of Pasta' })).toHaveValue('60')
    expect(within(card('Pasta')).getByRole('group', { name: 'Background sound of Pasta' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Background sound of Tea' })).toBeNull()

    await userEvent.click(within(chip).getByRole('button', { name: 'Pause the sound of Pasta' }))

    expect(background.storedPlaylists.playback.value.soundPaused).toBe(true)
    expect(await within(card('Pasta')).findByRole('button', { name: 'Resume the sound of Pasta' })).toBeInTheDocument()
  })

  test('a focus session that plays its background sound shows them on its chip in the running bar and in its detail', async () => {
    renderPopup('/focus-sessions')
    await userEvent.click(await screen.findByRole('button', { name: 'Start Morning' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))

    const chip = within(runningBar()).getByText('Morning').closest('li')!
    expect(within(chip).getByRole('group', { name: 'Background sound of Morning' })).toBeInTheDocument()
    const detail = screen.getByRole('region', { name: 'Morning' })
    expect(within(detail).getByRole('group', { name: 'Background sound of Morning' })).toBeInTheDocument()
    expect(within(detail).getByRole('slider', { name: 'Volume of Morning' })).toHaveValue('40')
  })
})
