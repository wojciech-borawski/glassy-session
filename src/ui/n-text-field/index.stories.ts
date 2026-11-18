import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NTextField from './index.vue'

const meta = {
  title: 'kit/n-text-field',
  component: NTextField,
  args: { label: 'Name', modelValue: '', placeholder: 'Job 3', hideLabel: false },
  render: args => ({
    components: { NTextField },
    setup: () => ({ args }),
    template: '<NTextField v-bind="args" v-model="args.modelValue" style="max-width: 280px" />'
  })
} satisfies Meta<typeof NTextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const HiddenLabel: Story = {
  args: { label: 'Session name', modelValue: 'Deep work', hideLabel: true }
}
