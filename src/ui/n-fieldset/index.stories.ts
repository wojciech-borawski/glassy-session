import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NFieldset from './index.vue'
import NNumberField from '../n-number-field/index.vue'

const meta = {
  title: 'kit/n-fieldset',
  component: NFieldset,
  args: { legend: 'Planned time' },
  render: args => ({
    components: { NFieldset, NNumberField },
    setup: () => ({ args, hours: ref(0), minutes: ref(25) }),
    template: `
      <NFieldset v-bind="args" style="max-width: 280px">
        <NNumberField v-model="hours" label="Hours" :min="0" :max="99" />
        <NNumberField v-model="minutes" label="Minutes" :min="0" :max="59" />
      </NFieldset>
    `
  })
} satisfies Meta<typeof NFieldset>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithError: Story = {
  args: { error: 'The planned time must be more than zero.' }
}
