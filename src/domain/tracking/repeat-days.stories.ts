import type { Meta, StoryObj } from '@storybook/vue3-vite'
import RepeatDays from './repeat-days.vue'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const meta = {
  title: 'tracking/repeat-days',
  component: RepeatDays,
  args: {
    tasks: [
      {
        taskId: 'gym',
        name: 'Gym',
        finished: 1,
        days: [
          { day: '2026-11-16', planned: HOUR, tracked: 40 * MINUTE, finished: false },
          { day: '2026-11-18', planned: HOUR, tracked: HOUR, finished: true }
        ]
      },
      { taskId: 'reading', name: 'Reading', finished: 0, days: [{ day: '2026-11-17', planned: 30 * MINUTE, tracked: 0, finished: false }] },
      { taskId: 'old-task', name: null, finished: 1, days: [{ day: '2026-11-19', planned: 20 * MINUTE, tracked: 25 * MINUTE, finished: true }] }
    ]
  },
  render: args => ({
    components: { RepeatDays },
    setup: () => ({ args }),
    template: '<div style="width: 440px"><RepeatDays v-bind="args" /></div>'
  })
} satisfies Meta<typeof RepeatDays>

export default meta
type Story = StoryObj<typeof meta>

export const AWeekOfRepeatDays: Story = {}
