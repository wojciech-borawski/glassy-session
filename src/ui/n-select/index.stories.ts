import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NSelect from './index.vue'

const meta = {
  title: 'kit/n-select',
  component: NSelect,
  args: {
    label: 'Focus step',
    hideLabel: false,
    modelValue: '30',
    options: [15, 25, 30, 45, 60].map(minutes => ({ value: String(minutes), label: `${minutes} min` }))
  },
  render: args => ({
    components: { NSelect },
    setup: () => ({ args }),
    template: '<NSelect v-bind="args" v-model="args.modelValue" style="max-width: 140px" />'
  })
} satisfies Meta<typeof NSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
