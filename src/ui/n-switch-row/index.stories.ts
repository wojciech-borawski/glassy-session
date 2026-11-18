import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NSwitchRow from './index.vue'

const meta = {
  title: 'kit/n-switch-row',
  component: NSwitchRow,
  args: { label: 'System notification', hint: 'Also shown by the operating system when it rings', modelValue: true },
  render: args => ({
    components: { NSwitchRow },
    setup: () => ({ args }),
    template: '<NSwitchRow v-bind="args" v-model="args.modelValue" />'
  })
} satisfies Meta<typeof NSwitchRow>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = {}

export const Off: Story = {
  args: { modelValue: false }
}
