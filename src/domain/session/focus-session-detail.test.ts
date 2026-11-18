import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, start, type Timer } from '../timer/model/timer'
import FocusSessionDetail from './focus-session-detail.vue'
import { createFocusSession, pause as pauseSession, pin, start as startSession, taskTimesAt, type FocusSession } from './model/focus-session'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NINE = Date.UTC(2026, 10, 17, 9)

const originalTimeZone = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'UTC'
})

afterAll(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTimeZone
  }
})

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tasks = [writeReport, answerEmail]

/** Write report for two focus steps, then answer email: focus 0-25, break, 30-55, break, 60-85, break, 90-95 minutes after the start. */
const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
}, [{ taskId: 'write-report', remainingTime: 50 * MINUTE }, { taskId: 'answer-email', remainingTime: 30 * MINUTE }])

const startedAgo = (ago: number) => startSession(morning, taskTimesAt(tasks, NINE - ago), NINE - ago).session

function renderDetail(session: FocusSession, now = NINE, timers: readonly Timer[] = tasks) {
  return render(FocusSessionDetail, { props: { session, tasks: timers, now }, global: { plugins: [createAppI18n()] } })
}

describe('the focus session detail', () => {
  test('shows the current focus step in a ring with what is left of it, which step it is, the task, when the session will end, and how far it has come', () => {
    renderDetail(startedAgo(10 * MINUTE))
    const detail = screen.getByRole('region', { name: 'Morning' })
    const ring = within(detail).getByRole('progressbar', { name: 'Focus step' })

    expect(ring).toHaveAttribute('aria-valuenow', '40')
    expect(within(ring).getByText('15:00')).toBeInTheDocument()
    expect(within(detail).getByText('Step 1 of 4')).toBeInTheDocument()
    expect(within(detail).getByText('Focus: Write report')).toBeInTheDocument()
    expect(within(detail).getByText('Ends about 10:25')).toBeInTheDocument()
    expect(within(detail).getByRole('progressbar', { name: 'Morning progress' })).toHaveAttribute('aria-valuenow', '11')
  })

  test('names the part in the ring a break while a break runs, and paused while the session is paused, with the delay pausing has made', () => {
    const inBreak = renderDetail(startedAgo(57 * MINUTE))
    const breakRing = screen.getByRole('progressbar', { name: 'Break' })
    expect(breakRing).toHaveAttribute('aria-valuenow', '40')
    expect(within(breakRing).getByText('03:00')).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    expect(screen.getByText('Break, next: Answer email')).toBeInTheDocument()
    inBreak.unmount()

    renderDetail(pauseSession(startedAgo(20 * MINUTE), NINE - 15 * MINUTE).session)

    expect(screen.getByRole('progressbar', { name: 'Paused' })).toHaveAttribute('aria-valuenow', '20')
    expect(screen.getByText('Paused: Write report')).toBeInTheDocument()
    expect(screen.getByText('15m later from pausing')).toBeInTheDocument()
  })

  test('offers to pause, skip the break or end the session early, and asks for what is chosen', async () => {
    const { emitted } = renderDetail(startedAgo(57 * MINUTE))

    for (const name of ['Pause Morning', 'Skip the break in Morning', 'End Morning early']) {
      await userEvent.click(screen.getByRole('button', { name }))
    }

    expect([emitted('pause'), emitted('skip'), emitted('endEarly')].map((events) => events?.length)).toEqual([1, 1, 1])
  })

  test('shows the steps up next and asks to move a step, send one to the front, or add the steps of a task with time left that the run does not have', async () => {
    const planWeek = createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 20 * MINUTE, appearance: { colour: 'violet' } })
    const doneTask = start(createTimer({ id: 'tidy-desk', name: 'Tidy desk', kind: 'task', plannedTime: 10 * MINUTE, appearance: { colour: 'teal' } }), NINE - HOUR).timer
    const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'pink' } })
    const { emitted } = renderDetail(startedAgo(10 * MINUTE), NINE, [...tasks, planWeek, doneTask, tea])
    const upNext = within(screen.getByRole('list', { name: 'Up next' }))

    expect(upNext.getAllByRole('listitem')).toHaveLength(3)
    await userEvent.click(upNext.getByRole('button', { name: 'Move step 3, Answer email, earlier' }))
    await userEvent.click(upNext.getByRole('button', { name: 'Send step 4, Answer email, to the front' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Plan the week'])
    await userEvent.click(screen.getByRole('button', { name: 'Add its steps' }))

    expect(emitted('moveStep')).toEqual([[2, 1]])
    expect(emitted('sendToFront')).toEqual([[3]])
    expect(emitted('addTaskSteps')).toEqual([[planWeek]])
  })

  test('offers a pin toggle named after the session, pressed while it is pinned, and asks to pin or unpin it as its card does', async () => {
    const unpinned = renderDetail(startedAgo(10 * MINUTE))
    const toggle = screen.getByRole('button', { name: 'Pin Morning to the overlay' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(unpinned.emitted()).toHaveProperty('pin')
    unpinned.unmount()

    const pinned = renderDetail(pin(startedAgo(10 * MINUTE)))
    await userEvent.click(screen.getByRole('button', { name: 'Pin Morning to the overlay', pressed: true }))
    expect(pinned.emitted()).toHaveProperty('unpin')
    expect(pinned.emitted()).not.toHaveProperty('pin')
  })

  test('asks to mark done the task of a step up next', async () => {
    const { emitted } = renderDetail(startedAgo(10 * MINUTE))

    await userEvent.click(within(screen.getByRole('list', { name: 'Up next' })).getByRole('button', { name: 'Mark Answer email done' }))

    expect(emitted('markTaskDone')).toEqual([[answerEmail]])
  })

  test('asks to mark done the task of the current focus step from beside that step, while it runs or is paused, and not in a break', async () => {
    const running = renderDetail(startedAgo(10 * MINUTE))
    await userEvent.click(screen.getByRole('button', { name: 'Mark Write report done and end this focus step' }))
    expect(running.emitted('markTaskDone')).toEqual([[writeReport]])
    running.unmount()

    const paused = renderDetail(pauseSession(startedAgo(20 * MINUTE), NINE - 15 * MINUTE).session)
    await userEvent.click(screen.getByRole('button', { name: 'Mark Write report done and end this focus step' }))
    expect(paused.emitted('markTaskDone')).toEqual([[writeReport]])
    paused.unmount()

    renderDetail(startedAgo(57 * MINUTE))
    expect(screen.queryByRole('button', { name: /and end this focus step/ })).not.toBeInTheDocument()
  })

  test('says a session whose last focus step has run out has finished, and offers nothing to change in it', () => {
    renderDetail(startedAgo(2 * HOUR))
    const detail = screen.getByRole('region', { name: 'Morning' })

    expect(within(detail).getByText('Finished at 08:35')).toBeInTheDocument()
    expect(within(detail).queryByRole('progressbar', { name: 'Focus step' })).not.toBeInTheDocument()
    expect(within(detail).queryByRole('button')).not.toBeInTheDocument()
    expect(within(detail).queryByRole('list', { name: 'Up next' })).not.toBeInTheDocument()
  })
})
