import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, shallowRef, type PropType } from 'vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import { soundOf, withSoundChosen, type OwnedSound } from './model/background-sound'
import { playbackAfter, type Playback, type SoundOwner } from './model/playback'
import type { Playlist } from './model/playlist'
import { eventOfSoundCommand } from './playback-engine'
import type { StoredPlaylists } from './ports'
import SoundControls from './sound-controls.vue'
import { provideStoredPlaylists } from './stored-playlists'

const deepFocus: Playlist = {
  id: 'deep-focus',
  name: 'Deep focus',
  files: [{ id: 'rain', name: 'rain-on-the-window.mp3', length: 1_865_000 }, { id: 'brown-noise', name: 'brown-noise.ogg', length: 3_600_000 }]
}
const writeReport: SoundOwner = { of: 'timer', id: 'write-report' }

/**
 * Stored playlists that follow each command through the playback model alone, so the controls can be pressed in a story.
 * When no file can play, the player has reported each file of the playlist as one that cannot play.
 */
function storyPlaylists(soundPaused: boolean, noFileCanPlay: boolean): StoredPlaylists {
  const playlists = shallowRef<readonly Playlist[]>([deepFocus])
  const backgroundSounds = shallowRef<readonly OwnedSound[]>([{ owner: writeReport, sound: { playlistId: 'deep-focus', volume: 0.4 } }])
  const library = () => ({ playlists: playlists.value, soundOf: (owner: SoundOwner) => soundOf(backgroundSounds.value, owner) })
  const started = playbackAfter(
    { owners: [{ owner: writeReport, running: true, place: { playlistId: 'deep-focus', fileId: 'rain', at: 0 } }], soundPaused, playing: null },
    { type: 'owner resumed', owner: writeReport },
    library()
  ).playback
  const playback = shallowRef<Playback>(noFileCanPlay
    ? deepFocus.files.reduce((soFar) => soFar.playing === null ? soFar : playbackAfter(soFar, { type: 'file cannot play', cue: soFar.playing }, library()).playback, started)
    : started)
  return {
    playlists,
    backgroundSounds,
    playback,
    async send(command) {
      if (command.type === 'chooseBackgroundSound') {
        backgroundSounds.value = withSoundChosen(backgroundSounds.value, command.owner, command.sound)
        playback.value = playbackAfter(playback.value, { type: 'sound changed', owner: command.owner }, library()).playback
      }
      return null
    },
    async sendSound(command) {
      playback.value = playbackAfter(playback.value, eventOfSoundCommand[command.type], library()).playback
      return null
    },
    keepFile: async () => null
  }
}

const ControlsOfWriteReport = defineComponent({
  props: {
    soundPaused: { type: Boolean, required: true },
    noFileCanPlay: { type: Boolean, required: true },
    size: { type: String as PropType<'full' | 'chip' | 'compact'>, required: true },
    layout: { type: String as PropType<'alone' | 'chip'>, required: true }
  },
  setup(props) {
    provideStoredPlaylists(storyPlaylists(props.soundPaused, props.noFileCanPlay))
    provideSnackbar()
    return () => {
      const controls = h(SoundControls, { owner: writeReport, name: 'Write report', size: props.size })
      return props.layout === 'alone'
        ? controls
        : h('div', { style: 'display: inline-flex; align-items: center; gap: 7px; padding: 3px 4px 3px 10px; border: 1px solid var(--n-line); border-radius: 999px; background: var(--n-surface); font-size: 12px' }, [h('b', 'Write report'), h('span', '54:48'), controls])
    }
  }
})

const meta = {
  title: 'music/sound-controls',
  component: ControlsOfWriteReport,
  args: { soundPaused: false, noFileCanPlay: false, size: 'full', layout: 'alone' },
  argTypes: { size: { control: 'select', options: ['full', 'chip', 'compact'] }, layout: { control: 'select', options: ['alone', 'chip'] } }
} satisfies Meta<typeof ControlsOfWriteReport>

export default meta
type Story = StoryObj<typeof meta>

export const Playing: Story = {}

export const SoundPaused: Story = {
  args: { soundPaused: true }
}

export const NoFileCanPlay: Story = {
  args: { noFileCanPlay: true }
}

export const OnAChip: Story = {
  args: { size: 'chip', layout: 'chip' }
}

export const Compact: Story = {
  args: { size: 'compact', layout: 'chip' }
}
