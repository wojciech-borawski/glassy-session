import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h, shallowRef } from 'vue'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import { useSounds } from '../sound/sounds'
import { noPlayback } from './model/playback'
import OwnAudioFiles from './own-audio-files.vue'
import type { StoredPlaylists } from './ports'
import { provideStoredPlaylists } from './stored-playlists'

/** The id the first audio file a story keeps is known by, which the alarm Wake up rings with. */
const RUNG_BY_AN_ALARM = '1'

const meta = {
  title: 'music/own-audio-files',
  component: OwnAudioFiles,
  render: () => ({
    setup() {
      const { audioFiles } = useSounds()
      const storedPlaylists: StoredPlaylists = {
        playlists: shallowRef([]),
        backgroundSounds: shallowRef([]),
        playback: shallowRef(noPlayback),
        sendSound: async () => null,
        keepFile: async () => null,
        async send(command) {
          if (command.type !== 'removeAudioFile') {
            return null
          }
          if (command.fileId === RUNG_BY_AN_ALARM) {
            return { reason: 'audio file in use', usedBy: [{ kind: 'alarm', name: 'Wake up' }] }
          }
          await audioFiles.remove(command.fileId)
          return null
        }
      }
      provideStoredPlaylists(storedPlaylists)
      const { messages } = provideSnackbar()
      return () => h('div', { style: 'width: 360px' }, [h(OwnAudioFiles), h(NSnackbar, { messages: messages.value })])
    }
  })
} satisfies Meta<typeof OwnAudioFiles>

export default meta
type Story = StoryObj<typeof meta>

/** Deleting Gong.mp3 is refused, since the alarm Wake up rings with it. The others can be deleted. */
export const SomeFiles: Story = {
  parameters: { audioFileNames: ['Gong.mp3', 'Morning birds.ogg', 'Rain on the window.mp3'] }
}

export const NoFiles: Story = {}
