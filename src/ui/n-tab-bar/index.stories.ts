import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NTabBar from './index.vue'

const meta = {
  title: 'kit/n-tab-bar',
  component: NTabBar,
  args: {
    label: 'Places',
    current: 'today',
    tabs: [
      { id: 'today', label: 'Today', icon: 'sun' },
      { id: 'timers', label: 'Timers', icon: 'stopwatch' },
      { id: 'focus', label: 'Focus', icon: 'target' },
      { id: 'alarms', label: 'Alarms', icon: 'bell' },
      { id: 'music', label: 'Music', icon: 'music-note' },
      { id: 'statistics', label: 'Statistics', icon: 'chart' },
      { id: 'settings', label: 'Settings', icon: 'sliders' }
    ]
  },
  render: args => ({
    components: { NTabBar },
    setup: () => ({ args }),
    template: '<NTabBar v-bind="args" style="max-width: 480px" @select="args.current = $event" />'
  })
} satisfies Meta<typeof NTabBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
