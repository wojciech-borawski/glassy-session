import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, start } from '../timer/model/timer'
import FocusSessionDialog from './focus-session-dialog.vue'
import { createFocusSession } from './model/focus-session'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const tasks = [
  start(createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } }), NINE - 35 * MINUTE).timer,
  createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } }),
  createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 45 * MINUTE, appearance: { colour: 'violet' } }),
  createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
]

const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'alternating'
}, [{ taskId: 'write-report', remainingTime: 55 * MINUTE }, { taskId: 'answer-email', remainingTime: 30 * MINUTE }])

const meta = {
  title: 'session/focus-session-dialog',
  component: FocusSessionDialog,
  args: { open: true, session: null, tasks, now: NINE },
  render: args => ({
    components: { FocusSessionDialog },
    setup: () => ({ args }),
    template: `
      <div style="position: relative; width: 480px; height: 600px">
        <FocusSessionDialog v-bind="args" @close="args.open = false" @save="args.open = false" @remove="args.open = false" />
      </div>
    `
  })
} satisfies Meta<typeof FocusSessionDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Adding: Story = {}

export const Editing: Story = {
  args: { session: morning }
}
