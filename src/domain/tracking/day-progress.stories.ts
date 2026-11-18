import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import DayProgress from './day-progress.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const planWeek = createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'violet' } })

const meta = {
  title: 'tracking/day-progress',
  component: DayProgress,
  args: {
    trackedTime: { 'write-report': { '2026-11-17': 35 * MINUTE }, 'read-mail': { '2026-11-17': 20 * MINUTE } },
    timers: [writeReport, readMail, planWeek],
    today: '2026-11-17'
  },
  render: args => ({
    components: { DayProgress },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><DayProgress v-bind="args" /></div>'
  })
} satisfies Meta<typeof DayProgress>

export default meta
type Story = StoryObj<typeof meta>

export const Today: Story = {}
