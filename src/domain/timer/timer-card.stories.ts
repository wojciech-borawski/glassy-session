import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, markDone, pause, start, type Timer } from './model/timer'
import TimerCard from './timer-card.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', description: 'Chapters 3 to 5', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const reading = createTimer({ id: 'read', name: 'Reading', description: '20 pages before bed', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [1, 3, 5] })
/** Repeats on Tuesday, the day of NINE, so its card offers Skip today. */
const practisePiano = createTimer({ id: 'practise-piano', name: 'Practise piano', kind: 'task', plannedTime: 4 * 60 * MINUTE, appearance: { colour: 'violet' }, repeatDays: [2, 4] })

const runningFor = (timer: Timer, used: number) => start(timer, NINE - used).timer

const meta = {
  title: 'timer/timer-card',
  component: TimerCard,
  args: { timer: writeReport, now: NINE },
  render: args => ({
    components: { TimerCard },
    setup: () => ({ args }),
    template: '<div style="width: 300px"><TimerCard v-bind="args" /></div>'
  })
} satisfies Meta<typeof TimerCard>

export default meta
type Story = StoryObj<typeof meta>

export const NotStarted: Story = {}

export const Running: Story = {
  args: { timer: runningFor(writeReport, 35 * MINUTE + 12_000) }
}

export const Paused: Story = {
  args: { timer: pause(runningFor(writeReport, 50 * MINUTE), NINE).timer }
}

export const DoneTask: Story = {
  args: { timer: runningFor(writeReport, 90 * MINUTE) }
}

export const FinishedTimer: Story = {
  args: { timer: runningFor(tea, 4 * MINUTE) }
}

export const RepeatingTask: Story = {
  args: { timer: reading }
}

export const DoneForTheDay: Story = {
  args: { timer: markDone(reading, NINE).timer }
}

export const InAFocusSession: Story = {
  args: { timer: { ...writeReport, remainingTime: 55 * MINUTE }, inSession: 'Morning focus' }
}

export const RepeatingTaskWithLastTime: Story = {
  args: { timer: reading, lastTime: { planned: 30 * MINUTE, tracked: 20 * MINUTE, finished: false } }
}

export const RepeatingTaskOnARepeatDay: Story = {
  args: { timer: practisePiano }
}

export const SkipTodayInAFocusSession: Story = {
  args: { timer: { ...practisePiano, remainingTime: 3 * 60 * MINUTE }, inSession: 'Morning focus' }
}

export const LastTimeSkipped: Story = {
  args: { timer: practisePiano, lastTime: { planned: 4 * 60 * MINUTE, tracked: 0, finished: false, skipped: true } }
}

export const LastTimeSkippedAfterSomeTime: Story = {
  args: { timer: practisePiano, lastTime: { planned: 4 * 60 * MINUTE, tracked: 40 * MINUTE, finished: false, skipped: true } }
}
