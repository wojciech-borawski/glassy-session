import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NProgressBar from './index.vue'

const meta = {
  title: 'kit/n-progress-bar',
  component: NProgressBar,
  args: { label: 'Job 1', value: 0.19 },
  argTypes: { value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } } },
  render: args => ({
    components: { NProgressBar },
    setup: () => ({ args }),
    template: '<NProgressBar v-bind="args" style="max-width: 240px" />'
  })
} satisfies Meta<typeof NProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
