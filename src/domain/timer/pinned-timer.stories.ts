import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createTimer, pause, start } from './model/timer'
import PinnedTimer from './pinned-timer.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

const meta = {
  title: 'timer/pinned-timer',
  component: PinnedTimer,
  args: { timer: tea, now: NINE },
  render: args => ({
    components: { PinnedTimer },
    setup: () => ({ args }),
    template: '<ul style="width: 260px; margin: 0; padding: 0; list-style: none"><PinnedTimer v-bind="args" /></ul>'
  })
} satisfies Meta<typeof PinnedTimer>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Running: Story = { args: { timer: start(tea, NINE - 90_000).timer } }

export const Paused: Story = { args: { timer: pause(start(tea, NINE - 2 * MINUTE).timer, NINE - MINUTE).timer } }

export const Finished: Story = { args: { timer: start(tea, NINE - 5 * MINUTE).timer } }
