import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NListRow from './index.vue'

const meta = {
  title: 'kit/n-list-row',
  component: NListRow,
  args: { running: false },
  render: args => ({
    components: { NListRow },
    setup: () => ({ args }),
    template: '<ul style="width: 260px; margin: 0; padding: 0; list-style: none"><NListRow v-bind="args"><b style="flex: 1">Tea</b><span>03:00</span></NListRow></ul>'
  })
} satisfies Meta<typeof NListRow>

export default meta
type Story = StoryObj<typeof meta>

export const Still: Story = {}

export const Running: Story = { args: { running: true } }

/** Running at rest: the marks in the theme's calm colour, without the sheen. */
export const RunningCalm: Story = { args: { running: true, calm: true } }
