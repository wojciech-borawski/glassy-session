import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { colourValues } from '../colours'
import NStackedBarChart from './index.vue'

const HOUR = 60

const report = (value: number) => ({ value, colour: colourValues.blue })
const mail = (value: number) => ({ value, colour: colourValues.green })
const planning = (value: number) => ({ value, colour: colourValues.violet })

const meta = {
  title: 'kit/n-stacked-bar-chart',
  component: NStackedBarChart,
  args: {
    label: 'Tracked time per day',
    bars: [
      { key: 'mon', label: 'Mon', total: '3h 30m', description: 'Monday: 3h 30m', parts: [report(2 * HOUR), mail(30), planning(HOUR)] },
      { key: 'tue', label: 'Tue', total: '1h 15m', description: 'Tuesday: 1h 15m', parts: [report(HOUR), mail(15)] },
      { key: 'wed', label: 'Wed', total: '0m', description: 'Wednesday: nothing tracked', parts: [] },
      { key: 'thu', label: 'Thu', total: '4h 45m', description: 'Thursday: 4h 45m', current: true, parts: [report(3 * HOUR), planning(HOUR + 45)] },
      { key: 'fri', label: 'Fri', total: '0m', description: 'Friday: nothing tracked', parts: [] },
      { key: 'sat', label: 'Sat', total: '0m', description: 'Saturday: nothing tracked', parts: [] },
      { key: 'sun', label: 'Sun', total: '0m', description: 'Sunday: nothing tracked', parts: [] }
    ]
  },
  render: args => ({
    components: { NStackedBarChart },
    setup: () => ({ args }),
    template: '<NStackedBarChart v-bind="args" style="max-width: 420px" />'
  })
} satisfies Meta<typeof NStackedBarChart>

export default meta
type Story = StoryObj<typeof meta>

export const Week: Story = {}

export const Empty: Story = {
  args: {
    bars: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ key: day, label: day, total: '0m', description: `${day}: nothing tracked`, parts: [] }))
  }
}
