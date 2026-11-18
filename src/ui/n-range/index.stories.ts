import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NRange from './index.vue'

const meta = {
  title: 'kit/n-range',
  component: NRange,
  args: { label: 'Volume', hideLabel: false, modelValue: 0.5, min: 0, max: 1, step: 0.05 },
  render: args => ({
    components: { NRange },
    setup: () => ({ args }),
    template: '<NRange v-bind="args" v-model="args.modelValue" style="max-width: 240px" />'
  })
} satisfies Meta<typeof NRange>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
