import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NNumberField from './index.vue'

const meta = {
  title: 'kit/n-number-field',
  component: NNumberField,
  args: { label: 'Minutes', modelValue: 25, min: 0, max: 59 },
  render: args => ({
    components: { NNumberField },
    setup: () => ({ args }),
    template: '<NNumberField v-bind="args" v-model="args.modelValue" style="max-width: 140px" />'
  })
} satisfies Meta<typeof NNumberField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
