import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import { totalsFor } from './model/statistics'
import WeekChart from './week-chart.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const timers = [writeReport, readMail]
const week = { first: '2026-11-16', last: '2026-11-22' }

const meta = {
  title: 'tracking/week-chart',
  component: WeekChart,
  args: {
    totals: totalsFor({
      'write-report': { '2026-11-16': 95 * MINUTE, '2026-11-17': 35 * MINUTE, '2026-11-19': 150 * MINUTE },
      'read-mail': { '2026-11-16': 25 * MINUTE, '2026-11-19': 10 * MINUTE },
      'old-task': { '2026-11-16': 20 * MINUTE }
    }, week, timers),
    timers,
    today: '2026-11-19'
  },
  render: args => ({
    components: { WeekChart },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><WeekChart v-bind="args" /></div>'
  })
} satisfies Meta<typeof WeekChart>

export default meta
type Story = StoryObj<typeof meta>

export const Week: Story = {}

export const NothingTracked: Story = {
  args: { totals: totalsFor({}, week, timers) }
}
