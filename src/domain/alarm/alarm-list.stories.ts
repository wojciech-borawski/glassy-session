import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AlarmList from './alarm-list.vue'
import { createAlarm, switchOff } from './model/alarm'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })
const windDown = switchOff(createAlarm({ id: 'wind-down', name: 'Wind down', time: 22 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [0, 1, 2, 3, 4, 5, 6] }, sendsNotification: true }))

const meta = {
  title: 'alarm/alarm-list',
  component: AlarmList,
  args: { alarms: [wakeUp, dentist, windDown] },
  render: args => ({
    components: { AlarmList },
    setup: () => ({ args }),
    template: '<div style="width: 452px"><AlarmList v-bind="args" /></div>'
  })
} satisfies Meta<typeof AlarmList>

export default meta
type Story = StoryObj<typeof meta>

export const WithSwitchedOff: Story = {}

export const Empty: Story = {
  args: { alarms: [] }
}
