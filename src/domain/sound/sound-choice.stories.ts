import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SoundChoice from './sound-choice.vue'

const meta = {
  title: 'sound/sound-choice',
  component: SoundChoice,
  args: { label: 'Ring sound', modelValue: { kind: 'built-in', name: 'bell' } },
  render: args => ({
    components: { SoundChoice },
    setup: () => ({ args }),
    template: `
      <div style="width: 360px">
        <SoundChoice v-bind="args" @update:model-value="args.modelValue = $event" />
      </div>
    `
  })
} satisfies Meta<typeof SoundChoice>

export default meta
type Story = StoryObj<typeof meta>

export const BuiltInSound: Story = {}

/** The person has kept two audio files of their own and chose the first. Previewing it plays the bell, since the story's files hold no audio. */
export const OwnAudioFile: Story = {
  args: { modelValue: { kind: 'audio file', fileId: '1' } },
  parameters: { audioFileNames: ['Gong.mp3', 'Rain on a window.ogg'] }
}

export const GoneAudioFile: Story = {
  args: { modelValue: { kind: 'audio file', fileId: 'removed' } }
}
