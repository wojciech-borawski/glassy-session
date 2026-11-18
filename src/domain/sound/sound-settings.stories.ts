import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SoundSettings from './sound-settings.vue'

const meta = {
  title: 'sound/sound-settings',
  component: SoundSettings,
  render: () => ({
    components: { SoundSettings },
    template: `
      <div style="width: 360px">
        <SoundSettings />
      </div>
    `
  })
} satisfies Meta<typeof SoundSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Defaults: Story = {}

export const OwnEndChimeAndQuiet: Story = {
  parameters: {
    audioFileNames: ['Gong.mp3'],
    soundSettings: { endChime: { kind: 'audio file', fileId: '1' }, startChime: { kind: 'built-in', name: 'digital' }, volume: 0.3 }
  }
}
