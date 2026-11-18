import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import FocusSessionDetail from './focus-session-detail.vue'
import { createFocusSession, pause, start, taskTimesAt } from './model/focus-session'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const planWeek = createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 20 * MINUTE, appearance: { colour: 'violet' } })
const tasks = [writeReport, answerEmail, planWeek]

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
  title: 'session/focus-session-detail',
  component: FocusSessionDetail,
  args: { session: startedAgo(12 * MINUTE + 20_000), tasks, now: NINE },
  render: args => ({
    components: { FocusSessionDetail },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><FocusSessionDetail v-bind="args" /></div>'
  })
} satisfies Meta<typeof FocusSessionDetail>

export default meta
type Story = StoryObj<typeof meta>

export const InAFocusStep: Story = {}

export const InABreak: Story = {
  args: { session: startedAgo(27 * MINUTE) }
}

export const PausedWithDelay: Story = {
  args: { session: pause(startedAgo(40 * MINUTE), NINE - 18 * MINUTE).session }
}

export const OnTheLastStep: Story = {
  args: { session: startedAgo(92 * MINUTE), tasks: [writeReport, answerEmail] }
}
