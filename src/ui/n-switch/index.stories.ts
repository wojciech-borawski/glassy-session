import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NSwitch from './index.vue'

const meta = {
  title: 'kit/n-switch',
  component: NSwitch,
  args: { label: 'System notification', modelValue: true },
  render: args => ({
    components: { NSwitch },
    setup: () => ({ args }),
    template: '<NSwitch v-bind="args" v-model="args.modelValue" />'
  })
} satisfies Meta<typeof NSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = {}

export const Off: Story = {
  args: { modelValue: false }
}
