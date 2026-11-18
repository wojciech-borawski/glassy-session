import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import { createFocusSession, pause, start, taskTimesAt } from './model/focus-session'
import PinnedSession from './pinned-session.vue'

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
  order: 'one after another'
}, taskTimesAt(tasks, NINE))

const startedAgo = (ago: number) => start(morning, taskTimesAt(tasks, NINE - ago), NINE - ago).session

const meta = {
  title: 'session/pinned-session',
  component: PinnedSession,
  args: { session: morning, tasks, now: NINE },
  render: args => ({
    components: { PinnedSession },
    setup: () => ({ args }),
    template: '<ul style="width: 260px; margin: 0; padding: 0; list-style: none"><PinnedSession v-bind="args" /></ul>'
  })
} satisfies Meta<typeof PinnedSession>

export default meta
type Story = StoryObj<typeof meta>

export const NotStarted: Story = {}

export const InAFocusStep: Story = { args: { session: startedAgo(10 * MINUTE) } }

export const InABreak: Story = { args: { session: startedAgo(27 * MINUTE) } }

export const Paused: Story = { args: { session: pause(startedAgo(10 * MINUTE), NINE - 5 * MINUTE).session } }
