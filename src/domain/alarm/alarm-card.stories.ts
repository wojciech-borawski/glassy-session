import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AlarmCard from './alarm-card.vue'
import { createAlarm } from './model/alarm'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })

const meta = {
  title: 'alarm/alarm-card',
  component: AlarmCard,
  args: { alarm: wakeUp },
  render: args => ({
    components: { AlarmCard },
    setup: () => ({ args }),
    template: '<div style="width: 220px"><AlarmCard v-bind="args" /></div>'
  })
} satisfies Meta<typeof AlarmCard>

export default meta
type Story = StoryObj<typeof meta>

export const Repeating: Story = {}

export const OneTime: Story = {
  args: { alarm: dentist }
}

export const SwitchedOff: Story = {
  args: { alarm: { ...wakeUp, name: 'Wind down', time: 22 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [0, 1, 2, 3, 4, 5, 6] }, switchedOn: false } }
}
