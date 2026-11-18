import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NProgressLine from './index.vue'

const breakColor = 'var(--n-text-muted)'

const meta = {
  title: 'kit/n-progress-line',
  component: NProgressLine,
  args: {
    label: 'Deep work',
    segments: [
      { length: 30, fill: 1, color: '#2f7dd1' },
      { length: 5, fill: 1, color: breakColor },
      { length: 30, fill: 0.4, color: '#c2571a' },
      { length: 5, fill: 0, color: breakColor },
      { length: 30, fill: 0, color: '#2f7dd1' },
      { length: 5, fill: 0, color: breakColor },
      { length: 15, fill: 0, color: '#c2571a' }
    ]
  },
  render: args => ({
    components: { NProgressLine },
    setup: () => ({ args }),
    template: '<NProgressLine v-bind="args" style="max-width: 420px" />'
  })
} satisfies Meta<typeof NProgressLine>

export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {}
