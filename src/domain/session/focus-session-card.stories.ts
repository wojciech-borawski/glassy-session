import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, start as startTimer } from '../timer/model/timer'
import FocusSessionCard from './focus-session-card.vue'
import { createFocusSession, pause, start, taskTimesAt } from './model/focus-session'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tasks = [writeReport, answerEmail]

const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'alternating'
}, taskTimesAt(tasks, NINE))

const startedAgo = (ago: number) => start(morning, taskTimesAt(tasks, NINE - ago), NINE - ago).session

const meta = {
  title: 'session/focus-session-card',
  component: FocusSessionCard,
  args: { session: morning, tasks, now: NINE },
  render: args => ({
    components: { FocusSessionCard },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><FocusSessionCard v-bind="args" /></div>'
  })
} satisfies Meta<typeof FocusSessionCard>

export default meta
type Story = StoryObj<typeof meta>

export const NotStarted: Story = {}

export const InAFocusStep: Story = {
  args: { session: startedAgo(12 * MINUTE + 20_000) }
}

export const InABreak: Story = {
  args: { session: startedAgo(27 * MINUTE) }
}

export const PausedWithDelay: Story = {
  args: { session: pause(startedAgo(40 * MINUTE), NINE - 18 * MINUTE).session }
}

export const NothingLeft: Story = {
  args: { tasks: tasks.map((task) => startTimer(task, NINE - 2 * 60 * MINUTE).timer) }
}
