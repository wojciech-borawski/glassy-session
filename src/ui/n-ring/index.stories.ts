import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NRing from './index.vue'

const meta = {
  title: 'kit/n-ring',
  component: NRing,
  args: { label: 'Job 1 focus step', value: 0.25, size: 128 },
  argTypes: { value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } } },
  render: args => ({
    components: { NRing },
    setup: () => ({ args }),
    template: `
      <NRing v-bind="args">
        <b style="font-size: 25px; font-variant-numeric: tabular-nums">22:30</b>
        <span style="color: var(--n-text-muted)">Focus</span>
      </NRing>
    `
  })
} satisfies Meta<typeof NRing>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
