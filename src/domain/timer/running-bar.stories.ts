import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, start } from './model/timer'
import RunningBar from './running-bar.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

const meta = {
  title: 'timer/running-bar',
  component: RunningBar,
  args: { timers: [start(writeReport, NINE - 35 * MINUTE).timer, start(tea, NINE - 90_000).timer], now: NINE },
  render: args => ({
    components: { RunningBar },
    setup: () => ({ args }),
    template: '<div style="width: 480px"><RunningBar v-bind="args" /></div>'
  })
} satisfies Meta<typeof RunningBar>

export default meta
type Story = StoryObj<typeof meta>

export const TwoRunning: Story = {}
