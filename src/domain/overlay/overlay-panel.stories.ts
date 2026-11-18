import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NIcon from '@/ui/n-icon/index.vue'
import { createFocusSession, progressAt, start as startSession, taskTimesAt } from '../session/model/focus-session'
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

/** Work, four and a half minutes into the break after its first focus step of answering email. */
const work = startSession(createFocusSession({
  id: 'work',
  name: 'Work',
  taskIds: ['answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
}, taskTimesAt(tasks, NINE)), taskTimesAt(tasks, NINE - 25 * MINUTE - 29_000), NINE - 25 * MINUTE - 29_000).session

const timers = [start(tea, NINE - 90_000).timer, pause(start(stretch, NINE - 6 * MINUTE).timer, NINE - 2 * MINUTE).timer]

const samplePage = `
  <article style="all: initial; display: block; min-height: 100vh; margin: -16px; padding: 48px 64px; background: #fafafa; color: #222; font: 16px/1.6 Georgia, serif">
    <h1 style="margin: 0 0 16px; font: 700 32px/1.2 Georgia, serif">A sample web page</h1>
    <p style="max-width: 640px">This page stands in for any site the person visits. Its own styles stay on the page, and the overlay keeps the look of the chosen theme wherever it stays.</p>
    <p style="max-width: 640px">Clicks outside the overlay reach the page, and the overlay takes no keyboard focus until the person moves to it.</p>
    <p style="max-width: 640px"><a href="#" style="color: #0645ad">A link on the page</a> and <button type="button">a button on the page</button>.</p>
  </article>
`

/** The sample page in white on black, as a dark site. */
const blackPage = samplePage.replace('background: #fafafa; color: #222', 'background: #000; color: #eee').replace('color: #0645ad', 'color: #8ab4f8')

/** A page full of colour, pictures and text, black and white among them, for seeing how much of it shows through the overlay. */
const busyPage = `
  <article style="all: initial; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; min-height: 100vh; margin: -16px; background: #fff; color: #111; font: 15px/1.5 Georgia, serif">
    <header style="grid-column: 1 / -1; padding: 24px 40px; background: #111; color: #fff; font: 700 30px/1.2 Georgia, serif">The Daily Sample <span style="font: 14px/1 system-ui; color: #f5c518">LIVE</span></header>
    <div style="grid-column: 1 / 3; min-height: 260px; background: linear-gradient(135deg, #ff6b6b, #f7b733 35%, #4ecdc4 65%, #1a535c)"></div>
    <div style="grid-column: 3 / 5; min-height: 260px; background: repeating-linear-gradient(45deg, #000 0 18px, #fff 18px 36px)"></div>
    <p style="grid-column: 1 / 3; margin: 0; padding: 24px 40px; background: #fff">Columns of small print run beside photographs and stripes, as on a news site. The overlay should let a little of this show through while its own text stays easy to read. <a href="#" style="color: #0645ad">A link</a>.</p>
    <p style="grid-column: 3 / 5; margin: 0; padding: 24px 40px; background: #000; color: #eee">A black block with light text sits beside the white one, so both ends of the brightness range lie under the overlay.</p>
    <div style="min-height: 200px; background: radial-gradient(circle at 30% 30%, #ffe66d, #ff6b6b 40%, #6a0572)"></div>
    <div style="min-height: 200px; background: conic-gradient(#e63946, #f1faee, #a8dadc, #457b9d, #1d3557, #e63946)"></div>
    <div style="min-height: 200px; background: #2b9348"></div>
    <div style="min-height: 200px; background: repeating-linear-gradient(0deg, #0077b6 0 10px, #90e0ef 10px 20px)"></div>
  </article>
`

const meta = {
  title: 'overlay/overlay-panel',
  component: OverlayPanel,
  args: { position: { corner: 'bottom right', offset: { x: 12, y: 12 } }, collapsed: false, count: 3 },
  parameters: { page: samplePage },
  render: (args, context) => ({
    components: { NIcon, OverlayPanel, PinnedSession, PinnedTimer },
    setup: () => ({ args, sessions: context.parameters.sessions ?? [morning], tasks, timers, now: NINE, pillIcon: context.parameters.pillIcon ?? 'target' }),
    template: `
      ${context.parameters.page}
      <OverlayPanel v-bind="args">
        <PinnedSession v-for="session in sessions" :key="session.id" :session="session" :tasks="tasks" :now="now" />
        <PinnedTimer v-for="timer in timers" :key="timer.id" :timer="timer" :now="now" />
        <template #running-icon><NIcon :name="pillIcon" :size="14" :style="pillIcon === 'cup' ? 'color: var(--n-calm)' : ''" /></template>
      </OverlayPanel>
    `
  })
} satisfies Meta<typeof OverlayPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Expanded: Story = {}

export const CollapsedNoneRunning: Story = { args: { collapsed: true } }

const morningRunning = { name: morning.name, remainingTime: progressAt(morning, NINE).remainingTime ?? 0 }

export const CollapsedOneRunning: Story = { args: { collapsed: true, running: { ...morningRunning, more: 0 } } }

export const CollapsedThreeRunning: Story = { args: { collapsed: true, running: { ...morningRunning, more: 2 } } }

export const InTheTopLeftCorner: Story = { args: { position: { corner: 'top left', offset: { x: 12, y: 12 } } } }

/** Dropped away from the corners in move mode, as the person left it to reach something on the page. */
export const AtAFreePosition: Story = { args: { position: { corner: 'top right', offset: { x: 220, y: 140 } } } }

/** With the Move toggle pressed, so the panel can be dragged anywhere or moved with the arrow keys. */
export const MoveModeOn: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button[aria-label="Move the overlay"]')?.click()
  }
}

/** Over the heading and text of the sample page, to see the page's words show faintly through. */
export const OverThePageText: Story = { args: { position: { corner: 'top left', offset: { x: 40, y: 20 } } } }

/** Over the text of a black page. */
export const OverABlackPage: Story = {
  args: { position: { corner: 'top left', offset: { x: 40, y: 20 } } },
  parameters: { page: blackPage }
}

export const PillOverABlackPage: Story = {
  args: { position: { corner: 'top left', offset: { x: 40, y: 20 } }, collapsed: true, running: { name: 'Tea', remainingTime: 150_000, more: 1 } },
  parameters: { page: blackPage }
}

/** Over a page of colour, stripes, black and white, to see how much of the page shows through. */
export const OverABusyPage: Story = {
  args: { position: { corner: 'top right', offset: { x: 60, y: 90 } } },
  parameters: { page: busyPage }
}

export const PillOverABusyPage: Story = {
  args: { position: { corner: 'top right', offset: { x: 60, y: 90 } }, collapsed: true, running: { name: 'Tea', remainingTime: 150_000, more: 1 } },
  parameters: { page: busyPage }
}

/** A focus session on a break, in the calm look of a break, next to a running focus step and a running timer, over the text of the sample page. */
export const WithABreak: Story = {
  args: { position: { corner: 'top left', offset: { x: 40, y: 20 } }, count: 4 },
  parameters: { sessions: [morning, work] }
}

/** Collapsed while the first running one is a focus session on a break: the cup in the calm colour, as the content app fills the icon. */
export const CollapsedOnABreak: Story = {
  args: { collapsed: true, running: { name: 'Work, break', remainingTime: progressAt(work, NINE).remainingTime ?? 0, more: 1 } },
  parameters: { pillIcon: 'cup' }
}
