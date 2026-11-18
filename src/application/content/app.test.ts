import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserAudioFileStore } from '@/infrastructure/browser/audio-file-store'
import { fakeOffscreen } from '@/infrastructure/browser/fake-offscreen'
import { sendMusicCommand } from '@/infrastructure/browser/music-commands'
import { readStoredPlayback } from '@/infrastructure/browser/playback-store'
import { sendSessionCommand } from '@/infrastructure/browser/session-commands'
import { createTimer, pin } from '@/domain/timer/model/timer'
import { saveThemeChoice } from '@/infrastructure/browser/theme-choice-store'
import { createBrowserTimerStore } from '@/infrastructure/browser/timer-store'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { runEngines } from '../background/run-engines'
import App from './app.vue'

vi.mock('@/infrastructure/browser/audio-file-store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/infrastructure/browser/audio-file-store')>()
  return { ...real, createBrowserAudioFileStore: vi.fn(real.createBrowserAudioFileStore) }
})

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const nap = createTimer({ id: 'nap', name: 'Nap', kind: 'timer', plannedTime: 20 * MINUTE, appearance: { colour: 'violet' } })

beforeEach(async () => {
  fakeBrowser.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
  await runEngines()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderOverlay() {
  return render(App, { global: { plugins: [createAppI18n()] } })
}

describe('the overlay on a web page', () => {
  test('shows nothing while nothing is pinned, and each pinned timer with its remaining time once one is', async () => {
    await createBrowserTimerStore().save([tea, nap])
    renderOverlay()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByRole('region', { name: 'Pinned timers and focus sessions' })).not.toBeInTheDocument()

    await createBrowserTimerStore().save([pin(tea).timer, nap])

    const overlay = await screen.findByRole('region', { name: 'Pinned timers and focus sessions' })
    expect(within(overlay).getByRole('listitem', { name: 'Tea' })).toHaveTextContent('04:00')
    expect(within(overlay).queryByRole('listitem', { name: 'Nap' })).not.toBeInTheDocument()
  })

  test('hides itself on every page while Show the overlay on web pages is switched off, and comes back when it is switched on', async () => {
    await createBrowserTimerStore().save([pin(tea).timer])
    await fakeBrowser.storage.local.set({ overlaySettings: { shownOnPages: false, corner: 'bottom right', collapsed: false } })
    renderOverlay()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByRole('region', { name: 'Pinned timers and focus sessions' })).not.toBeInTheDocument()

    await fakeBrowser.storage.local.set({ overlaySettings: { shownOnPages: true, corner: 'bottom right', collapsed: false } })

    expect(await screen.findByRole('region', { name: 'Pinned timers and focus sessions' })).toBeInTheDocument()
  })

  test('moved in move mode and collapsed to a pill, stays where it was moved, and every page remembers both', async () => {
    await createBrowserTimerStore().save([pin(tea).timer])
    renderOverlay()
    const toggle = await screen.findByRole('button', { name: 'Move the overlay', pressed: false })

    await userEvent.click(toggle)
    await userEvent.keyboard('{Shift>}{ArrowLeft}{ArrowUp}{/Shift}')
    await vi.waitFor(() => expect(screen.getByRole('region')).toHaveStyle({ bottom: '44px', right: '44px' }))
    await userEvent.click(screen.getByRole('button', { name: 'Collapse the overlay' }))

    expect(await screen.findByRole('button', { name: 'Show the overlay, 1 pinned' })).toHaveStyle({ bottom: '44px', right: '44px' })
    expect(await fakeBrowser.storage.local.get('overlaySettings')).toEqual({ overlaySettings: { shownOnPages: true, corner: 'bottom right', offset: { x: 44, y: 44 }, collapsed: true } })
  })

  test('starts and pauses a pinned timer, saying so inside its own box', async () => {
    await createBrowserTimerStore().save([pin(tea).timer])
    renderOverlay()
    const overlay = await screen.findByRole('region', { name: 'Pinned timers and focus sessions' })

    await userEvent.click(within(overlay).getByRole('button', { name: 'Start Tea' }))
    expect(await within(overlay).findByRole('status')).toHaveTextContent('Tea started')
    await userEvent.click(await within(overlay).findByRole('button', { name: 'Pause Tea' }))

    expect(await within(overlay).findByText('Tea paused')).toBeInTheDocument()
  })

  test('shows a pinned running focus session with its current focus step, and pauses and resumes it', async () => {
    const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
    await createBrowserTimerStore().save([writeReport])
    await sendSessionCommand({ type: 'add', session: { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another', pinned: true } })
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    renderOverlay()

    const row = await screen.findByRole('listitem', { name: 'Morning' })
    expect(row).toHaveTextContent('Focus: Write report')
    expect(row).toHaveTextContent('25:00')
    await userEvent.click(within(row).getByRole('button', { name: 'Pause Morning' }))
    await userEvent.click(await within(row).findByRole('button', { name: 'Resume Morning' }))

    expect(await within(row).findByRole('button', { name: 'Pause Morning' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Morning resumed')
  })

  test('draws in the theme and version chosen in the popup, and follows a new choice', async () => {
    await createBrowserTimerStore().save([pin(tea).timer])
    await saveThemeChoice({ theme: 'pebble', version: 'dark' })
    renderOverlay()
    const overlay = await screen.findByRole('region', { name: 'Pinned timers and focus sessions' })

    expect(overlay.closest('[data-theme]')).toHaveAttribute('data-theme', 'pebble')
    expect(overlay.closest('[data-theme]')).toHaveAttribute('data-version', 'dark')
    await saveThemeChoice({ theme: 'frost', version: 'light' })

    await vi.waitFor(() => expect(screen.getByRole('region').closest('[data-theme]')).toHaveAttribute('data-theme', 'frost'))
    expect(screen.getByRole('region').closest('[data-theme]')).toHaveAttribute('data-version', 'light')
  })
})

describe('the sound controls on the overlay', () => {
  test('a pinned timer whose background sound is heard can only pause and resume it from its row', async () => {
    fakeOffscreen()
    await createBrowserTimerStore().save([pin(tea).timer])
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [{ id: 'rain', name: 'rain.mp3' }] })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'tea' }, sound: { playlistId: 'focus-mix', volume: 0.6 } })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    renderOverlay()

    const row = await screen.findByRole('listitem', { name: 'Tea' })
    await userEvent.click(await within(row).findByRole('button', { name: 'Pause the sound of Tea' }))

    expect(within(row).queryByRole('button', { name: 'Next file for Tea' })).not.toBeInTheDocument()
    expect(within(row).queryByRole('slider')).not.toBeInTheDocument()
    expect(await within(row).findByRole('button', { name: 'Resume the sound of Tea' })).toBeInTheDocument()
    expect(await readStoredPlayback()).toMatchObject({ soundPaused: true })
  })

  test('follows the heard sound and sends sound commands without ever making the store of audio files', async () => {
    fakeOffscreen()
    await createBrowserTimerStore().save([pin(tea).timer])
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [{ id: 'rain', name: 'rain.mp3' }] })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'tea' }, sound: { playlistId: 'focus-mix', volume: 0.6 } })
    await sendTimerCommand({ type: 'start', timerId: 'tea' })
    vi.mocked(createBrowserAudioFileStore).mockClear()
    renderOverlay()

    const row = await screen.findByRole('listitem', { name: 'Tea' })
    await userEvent.click(await within(row).findByRole('button', { name: 'Pause the sound of Tea' }))
    await userEvent.click(await within(row).findByRole('button', { name: 'Resume the sound of Tea' }))

    expect(await within(row).findByRole('button', { name: 'Pause the sound of Tea' })).toBeInTheDocument()
    expect(createBrowserAudioFileStore).not.toHaveBeenCalled()
  })
})
