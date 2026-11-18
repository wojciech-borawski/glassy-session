import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NCheckbox from './index.vue'

const meta = {
  title: 'kit/n-checkbox',
  component: NCheckbox,
  args: { label: 'Write report', hint: '50m left', modelValue: true },
  render: args => ({
    components: { NCheckbox },
    setup: () => ({ args }),
    template: '<div style="width: 300px"><NCheckbox v-bind="args" v-model="args.modelValue" /></div>'
  })
} satisfies Meta<typeof NCheckbox>

export default meta
type Story = StoryObj<typeof meta>

export const Ticked: Story = {}

export const NotTicked: Story = {
  args: { modelValue: false }
}
