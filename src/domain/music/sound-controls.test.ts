import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { failure, type Refusal } from '@/domain/command/command-outcome'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { MusicCommand } from './commands'
import type { Playback, SoundOwner } from './model/playback'
import type { Playlist } from './model/playlist'
import type { SavedMusic, StoredPlaylists } from './ports'
import SoundControls from './sound-controls.vue'
import { provideStoredPlaylists } from './stored-playlists'

const focusMix: Playlist = {
  id: 'focus-mix',
  name: 'Focus mix',
  files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }, { id: 'waves', name: 'waves.ogg', length: 240_000 }, { id: 'piano', name: 'piano.mp3', length: 200_000 }]
}
const pasta: SoundOwner = { of: 'timer', id: 'pasta' }
const tea: SoundOwner = { of: 'timer', id: 'tea' }
const music: SavedMusic = { playlists: [focusMix], backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.6 } }] }
const pastaHeard: Playback = {
  owners: [{ owner: pasta, running: true, place: { playlistId: 'focus-mix', fileId: 'rain', at: 0 } }, { owner: tea, running: true, place: null }],
  soundPaused: false,
  playing: { owner: pasta, playlistId: 'focus-mix', fileId: 'rain', from: 0, volume: 0.6 }
}

function renderControls(storedPlaylists: StoredPlaylists, props: { owner: SoundOwner, name: string, size?: 'full' | 'chip' | 'compact' }) {
  return render(defineComponent({
    setup() {
      provideStoredPlaylists(storedPlaylists)
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(SoundControls, props)]
    }
  }), { global: { plugins: [createAppI18n()] } })
}

const controls = () => screen.getByRole('group', { name: 'Background sound of Pasta' })

describe('the sound controls of a timer or focus session', () => {
  test('show the previous file, pausing the sound, the next file and the volume of the owner whose sound is heard', () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta' })

    expect(within(controls()).getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Previous file for Pasta', 'Pause the sound of Pasta', 'Next file for Pasta'])
    expect(within(controls()).getByRole('slider', { name: 'Volume of Pasta' })).toHaveValue('60')
  })

  test('show nothing for an owner whose sound is not heard', () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: tea, name: 'Tea' })

    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('pausing the sound pauses it while the owner keeps running, says nothing, and offers to resume it', async () => {
    const stored = createMemoryStoredPlaylists(music, pastaHeard)
    renderControls(stored, { owner: pasta, name: 'Pasta' })

    await userEvent.click(screen.getByRole('button', { name: 'Pause the sound of Pasta' }))

    expect(stored.playback.value).toMatchObject({ soundPaused: true, playing: null })
    expect(stored.playback.value.owners[0]).toMatchObject({ owner: pasta, running: true })
    expect(await screen.findByRole('button', { name: 'Resume the sound of Pasta' })).toBeInTheDocument()
    expect(screen.getByRole('status').textContent?.trim()).toBe('')

    await userEvent.click(screen.getByRole('button', { name: 'Resume the sound of Pasta' }))

    expect(stored.playback.value).toMatchObject({ soundPaused: false, playing: { fileId: 'rain' } })
  })

  test('the next and the previous file move the heard sound along its playlist', async () => {
    const stored = createMemoryStoredPlaylists(music, pastaHeard)
    renderControls(stored, { owner: pasta, name: 'Pasta' })

    await userEvent.click(screen.getByRole('button', { name: 'Next file for Pasta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next file for Pasta' }))
    expect(stored.playback.value.playing).toMatchObject({ fileId: 'piano', from: 0 })

    await userEvent.click(screen.getByRole('button', { name: 'Previous file for Pasta' }))
    expect(stored.playback.value.playing).toMatchObject({ fileId: 'waves', from: 0 })
  })

  test('changing the volume keeps the playlist and plays the heard sound at the new volume', async () => {
    const stored = createMemoryStoredPlaylists(music, pastaHeard)
    renderControls(stored, { owner: pasta, name: 'Pasta' })

    await fireEvent.update(screen.getByRole('slider', { name: 'Volume of Pasta' }), '45')

    await vi.waitFor(() => expect(stored.backgroundSounds.value).toEqual([{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.45 } }]))
    expect(stored.playback.value.playing).toMatchObject({ fileId: 'rain', volume: 0.45 })
    expect(screen.getByRole('status').textContent?.trim()).toBe('')
  })

  test('a volume moved while the last one is still being saved sends only the volume it ends on', async () => {
    const stored = createMemoryStoredPlaylists(music, pastaHeard)
    const sent: MusicCommand[] = []
    let answer: (refusal: Refusal | null) => void = () => {}
    renderControls({
      ...stored,
      send: (command) => {
        sent.push(command)
        return new Promise((resolve) => { answer = resolve })
      }
    }, { owner: pasta, name: 'Pasta' })
    const slider = screen.getByRole('slider', { name: 'Volume of Pasta' })

    await fireEvent.update(slider, '50')
    await fireEvent.update(slider, '40')
    await fireEvent.update(slider, '30')
    answer(null)

    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent.map((command) => command.type === 'chooseBackgroundSound' && command.sound.volume)).toEqual([0.5, 0.3])
    expect(slider).toHaveValue('30')
  })

  test('a sound stopped as no file of its playlist can play shows as stopped, says why, and resuming it tries its files again', async () => {
    const noFileCanPlay: Playback = { ...pastaHeard, soundPaused: true, playing: null, unplayable: ['rain', 'waves', 'piano'] }
    const stored = createMemoryStoredPlaylists(music, noFileCanPlay)
    renderControls(stored, { owner: pasta, name: 'Pasta' })

    expect(within(controls()).getByRole('button', { name: 'Resume the sound of Pasta' })).toBeInTheDocument()
    expect(within(controls()).getByText('No file of Focus mix can play')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Resume the sound of Pasta' }))

    expect(stored.playback.value).toMatchObject({ soundPaused: false, playing: { fileId: 'rain' } })
    expect(screen.queryByText('No file of Focus mix can play')).toBeNull()
  })

  test('a sound command that is refused says why in the snackbar', async () => {
    renderControls({ ...createMemoryStoredPlaylists(music, pastaHeard), sendSound: async () => failure(new Error('The background did not answer')) }, { owner: pasta, name: 'Pasta' })

    await userEvent.click(screen.getByRole('button', { name: 'Next file for Pasta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('That did not work: The background did not answer')
  })

  test('compact, they only pause and resume the sound', () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta', size: 'compact' })

    expect(within(controls()).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Pause the sound of Pasta'])
    expect(screen.queryByRole('slider')).toBeNull()
  })

  test('on a chip, they show the previous file, pausing the sound and the next file, and the volume only once its button opens it', async () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta', size: 'chip' })

    expect(within(controls()).getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Previous file for Pasta', 'Pause the sound of Pasta', 'Next file for Pasta', 'Show the volume of Pasta'])
    expect(screen.queryByRole('slider')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Show the volume of Pasta', expanded: false }))

    expect(screen.getByRole('button', { name: 'Show the volume of Pasta', expanded: true })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Volume of Pasta' })).toHaveValue('60')
    expect(screen.getByRole('slider', { name: 'Volume of Pasta' })).toHaveFocus()
  })

  test('on a chip, Escape in the volume closes it and gives the focus back to its button', async () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta', size: 'chip' })
    screen.getByRole('button', { name: 'Show the volume of Pasta' }).focus()
    await userEvent.keyboard('{Enter}')

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByRole('button', { name: 'Show the volume of Pasta', expanded: false })).toHaveFocus()
  })

  test('on a chip, the volume closes once the focus leaves it, by keyboard or by pointer', async () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta', size: 'chip' })
    await userEvent.click(screen.getByRole('button', { name: 'Show the volume of Pasta' }))

    await userEvent.tab()

    expect(screen.queryByRole('slider')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Show the volume of Pasta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next file for Pasta' }))

    expect(screen.queryByRole('slider')).toBeNull()
  })

  test('on a chip, pressing the volume button again closes the volume', async () => {
    renderControls(createMemoryStoredPlaylists(music, pastaHeard), { owner: pasta, name: 'Pasta', size: 'chip' })
    await userEvent.click(screen.getByRole('button', { name: 'Show the volume of Pasta' }))

    await userEvent.click(screen.getByRole('button', { name: 'Show the volume of Pasta' }))

    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByRole('button', { name: 'Show the volume of Pasta', expanded: false })).toBeInTheDocument()
  })
})
