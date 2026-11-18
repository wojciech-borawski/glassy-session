import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createFocusSession, start as startSession, taskTimesAt } from '../session/model/focus-session'
import PinnedSession from '../session/pinned-session.vue'
import { createTimer, pause, start } from '../timer/model/timer'
import PinnedTimer from '../timer/pinned-timer.vue'
import OverlayPanel from './overlay-panel.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const stretch = createTimer({ id: 'stretch', name: 'Stretch', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'violet' } })
const tasks = [writeReport, answerEmail]

const morning = startSession(createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
}, taskTimesAt(tasks, NINE)), taskTimesAt(tasks, NINE - 12 * MINUTE), NINE - 12 * MINUTE).session

const timers = [start(tea, NINE - 90_000).timer, pause(start(stretch, NINE - 6 * MINUTE).timer, NINE - 2 * MINUTE).timer]

const samplePage = `
  <article style="all: initial; display: block; min-height: 100vh; margin: -16px; padding: 48px 64px; background: #fafafa; color: #222; font: 16px/1.6 Georgia, serif">
    <h1 style="margin: 0 0 16px; font: 700 32px/1.2 Georgia, serif">A sample web page</h1>
    <p style="max-width: 640px">This page stands in for any site the person visits. Its own styles stay on the page, and the overlay keeps the look of the chosen theme in its corner.</p>
    <p style="max-width: 640px">Clicks outside the overlay reach the page, and the overlay takes no keyboard focus until the person moves to it.</p>
    <p style="max-width: 640px"><a href="#" style="color: #0645ad">A link on the page</a> and <button type="button">a button on the page</button>.</p>
  </article>
`

const meta = {
  title: 'overlay/overlay-panel',
  component: OverlayPanel,
  args: { corner: 'bottom right', collapsed: false, count: 3 },
  render: args => ({
    components: { OverlayPanel, PinnedSession, PinnedTimer },
    setup: () => ({ args, morning, tasks, timers, now: NINE }),
    template: `
      ${samplePage}
      <OverlayPanel v-bind="args">
        <PinnedSession :session="morning" :tasks="tasks" :now="now" />
        <PinnedTimer v-for="timer in timers" :key="timer.id" :timer="timer" :now="now" />
      </OverlayPanel>
    `
  })
} satisfies Meta<typeof OverlayPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Expanded: Story = {}

export const Collapsed: Story = { args: { collapsed: true } }

export const InTheTopLeftCorner: Story = { args: { corner: 'top left' } }
