import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, start } from './model/timer'
import TimerList from './timer-list.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

const meta = {
  title: 'timer/timer-list',
  component: TimerList,
  args: { timers: [start(writeReport, NINE - 20 * MINUTE).timer, readMail, start(tea, NINE - 5 * MINUTE).timer], now: NINE },
  render: args => ({
    components: { TimerList },
    setup: () => ({ args }),
    template: '<div style="width: 452px"><TimerList v-bind="args" /></div>'
  })
} satisfies Meta<typeof TimerList>

export default meta
type Story = StoryObj<typeof meta>

export const WithFinished: Story = {}

export const Empty: Story = {
  args: { timers: [] }
}
