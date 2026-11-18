import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Playlist } from './model/playlist'
import type { StoredPlaylists } from './ports'
import { provideStoredPlaylists } from './stored-playlists'
import { useMusicCommands } from './use-music-commands'

type MusicCommands = ReturnType<typeof useMusicCommands>

function renderCommands(storedPlaylists: StoredPlaylists) {
  let commands: MusicCommands | undefined
  const Uses = defineComponent({
    setup() {
      commands = useMusicCommands()
      return () => null
    }
  })
  render(defineComponent({
    setup() {
      provideStoredPlaylists(storedPlaylists)
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(Uses)]
    }
  }), { global: { plugins: [createAppI18n()] } })
  if (commands === undefined) throw new Error('not rendered')
  return commands
}

describe('the music commands a view sends', () => {
  test('add a playlist with the name given and say so in the snackbar', async () => {
    const storedPlaylists = createMemoryStoredPlaylists()

    expect(await renderCommands(storedPlaylists).add('Focus mix')).toBeNull()

    expect(storedPlaylists.playlists.value).toEqual([{ id: expect.any(String), name: 'Focus mix', files: [] }])
    expect(await screen.findByRole('status')).toHaveTextContent('Focus mix added')
  })

  const rain = { id: 'rain', name: 'rain.mp3', length: 180_000 }
  const waves = { id: 'waves', name: 'waves.ogg', length: 240_000 }
  const focusMix: Playlist = { id: 'focus-mix', name: 'Focus mix', files: [rain, waves] }

  test.each([
    {
      does: 'rename a playlist',
      run: (commands: MusicCommands) => commands.rename(focusMix, 'Deep focus'),
      says: 'Focus mix renamed to Deep focus',
      leaves: [{ ...focusMix, name: 'Deep focus' }]
    },
    {
      does: 'remove a file from a playlist',
      run: (commands: MusicCommands) => commands.removeFile(focusMix, rain),
      says: 'rain.mp3 removed from Focus mix',
      leaves: [{ ...focusMix, files: [waves] }]
    },
    {
      does: 'move a file in a playlist',
      run: (commands: MusicCommands) => commands.moveFile(focusMix, 1, 0),
      says: 'waves.ogg moved to place 1 in Focus mix',
      leaves: [{ ...focusMix, files: [waves, rain] }]
    }
  ])('$does and say so in the snackbar', async ({ run, says, leaves }) => {
    const storedPlaylists = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] })

    expect(await run(renderCommands(storedPlaylists))).toBeNull()

    expect(storedPlaylists.playlists.value).toEqual(leaves)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test('add the picked audio files to a playlist in the order picked, leave out a file that is not audio, and say both in the snackbar', async () => {
    const storedPlaylists = createMemoryStoredPlaylists({ playlists: [{ ...focusMix, files: [] }], backgroundSounds: [] })
    const picked = [
      new File(['birds'], 'birds.wav', { type: 'audio/wav' }),
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
      new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' })
    ]

    expect(await renderCommands(storedPlaylists).addFiles(focusMix, picked)).toBeNull()

    expect(storedPlaylists.playlists.value[0]?.files.map(({ name }) => name)).toEqual(['birds.wav', 'rain.mp3'])
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('notes.txt could not be read as audio')
    expect(status).toHaveTextContent('2 files added to Focus mix')
  })

  test.each([
    { lost: { timers: 0, focusSessions: 0 }, says: 'Focus mix deleted' },
    { lost: { timers: 1, focusSessions: 0 }, says: 'Focus mix deleted. 1 timer now has no background sound.' },
    { lost: { timers: 1, focusSessions: 2 }, says: 'Focus mix deleted. 1 timer and 2 focus sessions now have no background sound.' },
    { lost: { timers: 0, focusSessions: 1 }, says: 'Focus mix deleted. 1 focus session now has no background sound.' }
  ])('delete a playlist and say how many timers and focus sessions lost it: $says', async ({ lost, says }) => {
    const storedPlaylists = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] })

    expect(await renderCommands(storedPlaylists).remove(focusMix, lost)).toBeNull()

    expect(storedPlaylists.playlists.value).toEqual([])
    expect((await screen.findByRole('status')).textContent?.trim()).toBe(says)
  })

  test.each([
    { sound: { playlistId: 'focus-mix', volume: 0.3 }, says: 'Pasta plays Focus mix at 30%' },
    { sound: { playlistId: null, volume: 0.8 }, says: 'Pasta plays no background sound' }
  ])('choose the background sound of a timer and say so in the snackbar: $says', async ({ sound, says }) => {
    const storedPlaylists = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] })
    const pasta = { of: 'timer', id: 'pasta' } as const

    expect(await renderCommands(storedPlaylists).chooseSound(pasta, 'Pasta', sound)).toBeNull()

    expect(storedPlaylists.backgroundSounds.value).toEqual([{ owner: pasta, sound }])
    expect((await screen.findByRole('status')).textContent?.trim()).toBe(says)
  })

  test('say why a refused command changed nothing, and not that it worked', async () => {
    const refusing: StoredPlaylists = { ...createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] }), send: async () => ({ reason: 'already removed' }) }

    expect(await renderCommands(refusing).rename(focusMix, 'Deep focus')).toEqual({ reason: 'already removed' })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('It was already removed')
    expect(status).not.toHaveTextContent('renamed')
  })

  test('a picked file whose bytes could not be kept ends in a failure that says what went wrong', async () => {
    const failing: StoredPlaylists = { ...createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] }), keepFile: async () => { throw new Error('The disk is full') } }

    expect(await renderCommands(failing).addFiles(focusMix, [new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' })])).toEqual({ reason: 'failed', message: 'The disk is full' })

    expect(await screen.findByRole('status')).toHaveTextContent('That did not work: The disk is full')
  })

  test('picking only files that are not audio sends no command and says only that', async () => {
    const storedPlaylists = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] })
    const sent = vi.spyOn(storedPlaylists, 'send')

    expect(await renderCommands(storedPlaylists).addFiles(focusMix, [new File(['notes'], 'notes.txt', { type: 'text/plain' })])).toBeNull()

    expect(sent).not.toHaveBeenCalled()
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('notes.txt could not be read as audio')
    expect(status).not.toHaveTextContent('added')
  })
})
