import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { SoundUse } from '../sound/model/sound-use'
import { provideSounds } from '../sound/sounds'
import OwnAudioFiles from './own-audio-files.vue'
import { provideStoredPlaylists } from './stored-playlists'

/** The own audio files list over memory sounds keeping the files named, of which the ring sounds and chimes given play some. */
async function renderList(names: readonly string[], uses: (ids: readonly string[]) => readonly SoundUse[] = () => []) {
  const sounds = createMemorySounds()
  const ids: string[] = []
  for (const name of names) {
    ids.push(await sounds.audioFiles.save({ name, type: 'audio/mpeg', bytes: new ArrayBuffer(1) }))
  }
  const storedPlaylists = createMemoryStoredPlaylists(undefined, undefined, { audioFiles: sounds.audioFiles, soundUses: async () => uses(ids) })
  render(defineComponent({
    setup() {
      provideSounds(sounds)
      provideStoredPlaylists(storedPlaylists)
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(OwnAudioFiles)]
    }
  }), { global: { plugins: [createAppI18n()] } })
  return sounds
}

const listedNames = () => within(screen.getByRole('list', { name: 'Own audio files' })).getAllByRole('listitem').map((row) => within(row).getByText(/\.mp3$/).textContent)

describe('the list of the person\'s own audio files', () => {
  test('lists each kept audio file by name, in the order kept, each with a Delete button', async () => {
    await renderList(['gong.mp3', 'rain.mp3'])

    await waitFor(() => expect(listedNames()).toEqual(['gong.mp3', 'rain.mp3']))
    expect(screen.getByRole('button', { name: 'Delete gong.mp3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete rain.mp3' })).toBeInTheDocument()
  })

  test('says when no audio file is kept', async () => {
    await renderList([])

    expect(await screen.findByText('No own audio files yet. Add one as a ring sound, a chime or to a playlist.')).toBeInTheDocument()
  })

  test('deleting an audio file nothing plays forgets it, takes it off the list and says so', async () => {
    const sounds = await renderList(['gong.mp3', 'rain.mp3'])

    await userEvent.click(await screen.findByRole('button', { name: 'Delete gong.mp3' }))

    await waitFor(() => expect(listedNames()).toEqual(['rain.mp3']))
    expect(screen.getByRole('status')).toHaveTextContent('gong.mp3 deleted')
    expect((await sounds.audioFiles.list()).map(({ name }) => name)).toEqual(['rain.mp3'])
  })

  test('deleting an audio file a ring sound or a chime still plays is refused, naming what plays it, and the file stays', async () => {
    const sounds = await renderList(['gong.mp3'], ([gong]) => [{ sound: { kind: 'audio file', fileId: gong ?? '' }, by: { kind: 'alarm', name: 'Wake up' } }])

    await userEvent.click(await screen.findByRole('button', { name: 'Delete gong.mp3' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('It is still played by the alarm Wake up'))
    expect(listedNames()).toEqual(['gong.mp3'])
    expect(await sounds.audioFiles.list()).toHaveLength(1)
  })
})
