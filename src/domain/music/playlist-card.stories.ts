import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { Playlist } from './model/playlist'
import PlaylistCard from './playlist-card.vue'

const deepFocus: Playlist = {
  id: 'deep-focus',
  name: 'Deep focus',
  files: [
    { id: 'rain', name: 'rain-on-the-window.mp3', length: 1_865_000 },
    { id: 'brown-noise', name: 'brown-noise.ogg', length: 3_600_000 },
    { id: 'piano', name: 'a-very-long-file-name-of-slow-piano-music-recorded-at-home.wav' }
  ]
}

const meta = {
  title: 'music/playlist-card',
  component: PlaylistCard,
  args: { playlist: deepFocus, usedBy: ['Write report', 'Morning focus'] },
  render: args => ({
    components: { PlaylistCard },
    setup: () => ({ args }),
    template: '<div style="width: 340px"><PlaylistCard v-bind="args" /></div>'
  })
} satisfies Meta<typeof PlaylistCard>

export default meta
type Story = StoryObj<typeof meta>

export const UsedWithFiles: Story = {}

export const Empty: Story = {
  args: { playlist: { id: 'evening', name: 'Evening', files: [] }, usedBy: [] }
}
