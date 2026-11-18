import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NColourPicker from './index.vue'

const meta = {
  title: 'kit/n-colour-picker',
  component: NColourPicker,
  args: { label: 'Colour', modelValue: 'green' },
  render: args => ({
    components: { NColourPicker },
    setup: () => ({ args }),
    template: '<NColourPicker v-bind="args" @update:model-value="args.modelValue = $event" />'
  })
} satisfies Meta<typeof NColourPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
