import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, start as startTimer } from '../timer/model/timer'
import RunningBar from '../timer/running-bar.vue'
import { createFocusSession, start, taskTimesAt } from './model/focus-session'
import RunningSessionChips from './running-session-chips.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const tasks = [writeReport, answerEmail]

const sessionOf = (id: string, name: string, taskId: string, startedAgo: number) => start(createFocusSession(
  { id, name, taskIds: [taskId], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' },
  taskTimesAt(tasks, NINE)
), taskTimesAt(tasks, NINE - startedAgo), NINE - startedAgo).session

const meta = {
  title: 'session/running-session-chips',
  component: RunningSessionChips,
  args: { sessions: [sessionOf('morning', 'Morning', 'write-report', 10 * MINUTE), sessionOf('work', 'Work', 'answer-email', 25 * MINUTE + 29_000)], now: NINE },
  render: args => ({
    components: { RunningBar, RunningSessionChips },
    setup: () => ({ args, timers: [startTimer(tea, NINE - 90_000).timer] }),
    template: `
      <div style="width: 480px">
        <RunningBar :timers="timers" :now="args.now">
          <template #before><RunningSessionChips v-bind="args" /></template>
        </RunningBar>
      </div>
    `
  })
} satisfies Meta<typeof RunningSessionChips>

export default meta
type Story = StoryObj<typeof meta>

/** A focus session in a focus step, one on a break and a running timer, as the popup's running bar shows them. */
export const InAFocusStepAndOnABreak: Story = {}
