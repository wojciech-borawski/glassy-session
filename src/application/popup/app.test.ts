import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { localDayOf } from '@/domain/tracking/local-day'
import { createBrowserSoundSettingsStore } from '@/infrastructure/browser/sound-settings-store'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import App from './app.vue'

function renderPopup(path = '/') {
  window.location.hash = `#${path}`
  return render(App, {
    global: { plugins: [{ install: app => setupRouter(app, 'popup') }, createAppI18n()] }
  })
}

beforeEach(() => {
  fakeBrowser.reset()
  vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({ manifest_version: 3, name: 'GlassySession: Timer, Alarm and Focus sessions', version: '4.5.6' })
})

describe('popup', () => {
  test('opens on Today, with a tab for each of the seven places', async () => {
    renderPopup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    const places = screen.getByRole('navigation', { name: 'Places' })
    expect(within(places).getAllByRole('button').map(tab => tab.textContent?.trim()))
      .toEqual(['Today', 'Timers', 'Focus', 'Alarms', 'Music', 'Statistics', 'Settings'])
  })

  test('goes to the place whose tab is chosen', async () => {
    renderPopup()
    await screen.findByRole('heading', { level: 1, name: 'Today' })

    await userEvent.click(screen.getByRole('button', { name: 'Focus' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Focus sessions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-current', 'page')
  })

  test('changes the theme of the whole popup as soon as one is chosen in Settings', async () => {
    renderPopup('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    await userEvent.click(screen.getByRole('button', { name: /Lagoon/ }))

    expect(screen.getByRole('button', { name: /Lagoon/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Frost/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { level: 1 }).closest('[data-theme]')).toHaveAttribute('data-theme', 'lagoon')
  })

  test('ends Settings with About, which names the product and shows the version read from the manifest', async () => {
    renderPopup('/settings')

    const about = await screen.findByRole('region', { name: 'About' })

    expect(within(about).getByText('GlassySession')).toBeInTheDocument()
    expect(within(about).getByText('GlassySession: Timer, Alarm and Focus sessions')).toBeInTheDocument()
    expect(within(about).getByText('Version 4.5.6')).toBeInTheDocument()
    expect(within(about).getByText('Made with WXT and Vue')).toBeInTheDocument()
  })

  test('shows Sounds, then Overlay, then Theme, then About last in Settings, and saves an end chime chosen there for the background to play', async () => {
    renderPopup('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.trim())).toEqual(['Sounds', 'Overlay', 'Theme', 'About'])

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'End chime' }), 'Digital')

    await waitFor(async () => expect(await createBrowserSoundSettingsStore().load()).toMatchObject({ endChime: { kind: 'built-in', name: 'digital' } }))
  })

  test('switches between matching the system, light and dark as soon as one is chosen in Settings', async () => {
    renderPopup('/settings')
    const title = await screen.findByRole('heading', { level: 1, name: 'Settings' })

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    const afterDark = title.closest('[data-theme]')?.getAttribute('data-version')
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))

    expect(afterDark).toBe('dark')
    expect(title.closest('[data-theme]')).toHaveAttribute('data-version', 'light')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Match system' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('opens in the theme and version chosen last time', async () => {
    await fakeBrowser.storage.local.set({ themeChoice: { theme: 'pebble', version: 'dark' } })

    renderPopup('/settings')

    const title = await screen.findByRole('heading', { level: 1, name: 'Settings' })
    expect(title.closest('[data-theme]')).toHaveAttribute('data-theme', 'pebble')
    expect(title.closest('[data-theme]')).toHaveAttribute('data-version', 'dark')
    expect(screen.getByRole('button', { name: /Pebble/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('saves each theme and version chosen in Settings for the next time it opens', async () => {
    renderPopup('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    await userEvent.click(screen.getByRole('button', { name: /Lagoon/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

    await vi.waitFor(async () => expect(await fakeBrowser.storage.local.get('themeChoice')).toEqual({ themeChoice: { theme: 'lagoon', version: 'dark' } }))
  })

  test('shows the overlay on web pages until it is switched off in Settings, and saves the choice for every page', async () => {
    renderPopup('/settings')
    const overlay = await screen.findByRole('region', { name: 'Overlay' })
    const shown = within(overlay).getByRole('switch', { name: 'Show the overlay on web pages' })

    await vi.waitFor(() => expect(shown).toHaveAttribute('aria-checked', 'true'))
    await userEvent.click(shown)

    await vi.waitFor(async () => expect(await fakeBrowser.storage.local.get('overlaySettings')).toMatchObject({ overlaySettings: { shownOnPages: false } }))
    expect(shown).toHaveAttribute('aria-checked', 'false')
  })

  test('shows the tracked time kept in storage on Statistics', async () => {
    await fakeBrowser.storage.local.set({ trackedTime: { 'old-task': { [localDayOf(Date.now()).day]: 45 * 60_000 } } })

    renderPopup('/statistics')

    const byTask = await screen.findByRole('list', { name: 'By task' })
    expect(within(byTask).getByRole('listitem')).toHaveTextContent('Removed task 45m')
  })
})
