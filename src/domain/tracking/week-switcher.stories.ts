import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WeekSwitcher from './week-switcher.vue'

const meta = {
  title: 'tracking/week-switcher',
  component: WeekSwitcher,
  args: { week: { first: '2026-11-16', last: '2026-11-22' }, canGoBack: true, canGoForward: false },
  render: args => ({
    components: { WeekSwitcher },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><WeekSwitcher v-bind="args" /></div>'
  })
} satisfies Meta<typeof WeekSwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const ThisWeek: Story = {}

export const OnlyWeek: Story = {
  args: { canGoBack: false, canGoForward: false }
}
