import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NDayPicker from './index.vue'

const meta = {
  title: 'kit/n-day-picker',
  component: NDayPicker,
  args: { label: 'Repeat days', modelValue: [1, 2, 3, 4, 5] },
  render: args => ({
    components: { NDayPicker },
    setup: () => ({ args }),
    template: '<NDayPicker v-bind="args" v-model="args.modelValue" />'
  })
} satisfies Meta<typeof NDayPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Weekdays: Story = {}

export const NoDays: Story = {
  args: { modelValue: [] }
}
