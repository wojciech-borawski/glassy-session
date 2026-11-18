import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import TaskTotals from './task-totals.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

const meta = {
  title: 'tracking/task-totals',
  component: TaskTotals,
  args: {
    tasks: [
      { taskId: 'write-report', name: 'Write report', tracked: 280 * MINUTE },
      { taskId: 'read-mail', name: 'Read mail', tracked: 35 * MINUTE },
      { taskId: 'old-task', name: null, tracked: 20 * MINUTE }
    ],
    timers: [writeReport, readMail]
  },
  render: args => ({
    components: { TaskTotals },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><TaskTotals v-bind="args" /></div>'
  })
} satisfies Meta<typeof TaskTotals>

export default meta
type Story = StoryObj<typeof meta>

export const WithARemovedTask: Story = {}

export const NothingTracked: Story = {
  args: { tasks: [] }
}
