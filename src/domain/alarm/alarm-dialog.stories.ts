import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AlarmDialog from './alarm-dialog.vue'
import { createAlarm } from './model/alarm'

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7.5 * 3_600_000, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * 3_600_000, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })

const meta = {
  title: 'alarm/alarm-dialog',
  component: AlarmDialog,
  args: { open: true, alarm: null, today: '2026-11-17', now: new Date('2026-11-17T07:00').getTime() },
  render: args => ({
    components: { AlarmDialog },
    setup: () => ({ args }),
    template: `
      <div style="position: relative; width: 480px; height: 600px">
        <AlarmDialog v-bind="args" @close="args.open = false" @save="args.open = false" @remove="args.open = false" />
      </div>
    `
  })
} satisfies Meta<typeof AlarmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Adding: Story = {}

export const EditingRepeating: Story = {
  args: { alarm: wakeUp }
}

export const EditingOneTime: Story = {
  args: { alarm: dentist }
}
