import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer } from './model/timer'
import TimerDialog from './timer-dialog.vue'

const writeReport = createTimer({ id: 'write-report', name: 'Write report', description: 'Chapters 3 to 5', kind: 'task', plannedTime: 90 * 60_000, appearance: { colour: 'violet' } })
const reading = createTimer({ id: 'read', name: 'Reading', kind: 'task', plannedTime: 30 * 60_000, appearance: { colour: 'green' }, repeatDays: [1, 3, 5] })

const meta = {
  title: 'timer/timer-dialog',
  component: TimerDialog,
  args: { open: true, timer: null },
  render: args => ({
    components: { TimerDialog },
    setup: () => ({ args }),
    template: `
      <div style="position: relative; width: 420px; height: 720px">
        <TimerDialog v-bind="args" @close="args.open = false" @save="args.open = false" @remove="args.open = false" />
      </div>
    `
  })
} satisfies Meta<typeof TimerDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Adding: Story = {}

export const Editing: Story = {
  args: { timer: writeReport }
}

export const EditingARepeatingTask: Story = {
  args: { timer: reading }
}

export const InThePopupSize: Story = {
  args: { timer: reading },
  render: args => ({
    components: { TimerDialog },
    setup: () => ({ args }),
    template: `
      <div style="position: relative; width: 480px; height: 600px">
        <TimerDialog v-bind="args" @close="args.open = false" @save="args.open = false" @remove="args.open = false" />
      </div>
    `
  })
}
