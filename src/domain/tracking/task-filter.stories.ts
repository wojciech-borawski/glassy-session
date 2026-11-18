import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from '../timer/model/timer'
import TaskFilter from './task-filter.vue'

const MINUTE = 60_000

const gym = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'orange' }, repeatDays: [1, 3, 5] })
const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

const meta = {
  title: 'tracking/task-filter',
  component: TaskFilter,
  args: {
    choices: [
      { taskId: 'gym', name: 'Gym' },
      { taskId: 'write-report', name: 'Write report' },
      { taskId: 'read-mail', name: 'Read mail' },
      { taskId: 'old-task', name: null }
    ],
    modelValue: [],
    timers: [gym, writeReport, readMail]
  },
  render: args => ({
    components: { TaskFilter },
    setup: () => {
      const chosen = ref(args.modelValue)
      return { args, chosen }
    },
    template: '<div style="width: 440px"><TaskFilter v-bind="args" v-model="chosen" /></div>'
  })
} satisfies Meta<typeof TaskFilter>

export default meta
type Story = StoryObj<typeof meta>

export const AllTasks: Story = {}

export const OneTaskChosen: Story = {
  args: { modelValue: ['gym'] }
}

export const SeveralTasksChosen: Story = {
  args: { modelValue: ['gym', 'old-task'] }
}
