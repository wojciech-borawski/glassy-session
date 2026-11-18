import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, start, type Timer } from '../timer/model/timer'
import FocusSessionCard from './focus-session-card.vue'
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

function renderCard(session: FocusSession, now = NINE, timers: readonly Timer[] = tasks) {
  return render(FocusSessionCard, { props: { session, tasks: timers, now }, global: { plugins: [createAppI18n()] } })
}

function buttonNames(card: HTMLElement) {
  return within(card).getAllByRole('button').filter((button) => !button.hasAttribute('aria-pressed')).map((button) => button.getAttribute('aria-label') ?? button.textContent)
}

describe('the focus session card', () => {
  test('shows a session that has not started with its tasks, how long it would take, its focus steps and breaks, and an empty progress line', () => {
    renderCard(morning)

    const card = screen.getByRole('article', { name: 'Morning' })
    expect(within(card).getByText('Write report, Answer email')).toBeInTheDocument()
    expect(within(card).getByText('1h 35m')).toBeInTheDocument()
    expect(within(card).getByText('4 focus steps of 25m with 5m breaks')).toBeInTheDocument()
    expect(within(card).getByRole('progressbar', { name: 'Morning progress' })).toHaveAttribute('aria-valuenow', '0')
  })

  test('offers to start or edit a session that has not started, naming the session, and asks for what is chosen', async () => {
    const { emitted } = renderCard(morning)
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(buttonNames(card)).toEqual(['Start Morning', 'Edit Morning'])
    await userEvent.click(within(card).getByRole('button', { name: 'Start Morning' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Edit Morning' }))

    expect(emitted('start')).toHaveLength(1)
    expect(emitted('edit')).toHaveLength(1)
  })

  test('says there is nothing left to do and offers no start when the tasks of a session have no time left', () => {
    const doneTasks = tasks.map((task) => start(task, NINE - 2 * HOUR).timer)
    renderCard(morning, NINE, doneTasks)
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('Nothing left to do in this session.')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Start Morning' })).toBeDisabled()
  })

  test('shows a running session in a focus step with the task, what is left of the step, when it will end, and how far it has come', () => {
    renderCard(startedAgo(10 * MINUTE))
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('15:00')).toBeInTheDocument()
    expect(within(card).getByText('Focus: Write report')).toBeInTheDocument()
    expect(within(card).getByText('Ends about 10:25')).toBeInTheDocument()
    expect(within(card).queryByText(/from pausing/)).not.toBeInTheDocument()
    expect(within(card).getByRole('progressbar', { name: 'Morning progress' })).toHaveAttribute('aria-valuenow', '11')
  })

  test('shows a session in a break with the task that comes next, and offers to pause, skip the break, end early or open it', async () => {
    const { emitted } = renderCard(startedAgo(57 * MINUTE))
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('03:00')).toBeInTheDocument()
    expect(within(card).getByText('Break, next: Answer email')).toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Pause Morning', 'Skip the break in Morning', 'End Morning early', 'Open Morning'])
    for (const name of ['Pause Morning', 'Skip the break in Morning', 'End Morning early', 'Open Morning']) {
      await userEvent.click(within(card).getByRole('button', { name }))
    }

    expect([emitted('pause'), emitted('skip'), emitted('endEarly'), emitted('open')].map((events) => events?.length)).toEqual([1, 1, 1, 1])
  })

  test('shows a paused session with how much later pausing has made its end, and offers to resume, end early or open it', async () => {
    const paused = pauseSession(startedAgo(20 * MINUTE), NINE - 15 * MINUTE).session
    const { emitted } = renderCard(paused)
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('20:00')).toBeInTheDocument()
    expect(within(card).getByText('Paused: Write report')).toBeInTheDocument()
    expect(within(card).getByText('Ends about 10:30')).toBeInTheDocument()
    expect(within(card).getByText('15m later from pausing')).toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Resume Morning', 'End Morning early', 'Open Morning'])
    await userEvent.click(within(card).getByRole('button', { name: 'Resume Morning' }))

    expect(emitted('resume')).toHaveLength(1)
  })

  test('says a session paused in a break is paused there, with the task that comes next, and offers no skip', () => {
    renderCard(pauseSession(startedAgo(57 * MINUTE), NINE).session, NINE + MINUTE)
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('Paused in a break, next: Answer email')).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Skip the break in Morning' })).not.toBeInTheDocument()
  })

  test('says a session whose last focus step has run out has finished, at the moment it ended, before the background settles it', () => {
    renderCard(startedAgo(2 * HOUR))
    const card = screen.getByRole('article', { name: 'Morning' })

    expect(within(card).getByText('Finished at 08:35')).toBeInTheDocument()
    expect(within(card).queryByText(/Focus:|Ends about/)).not.toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Open Morning'])
  })

  test('offers a pin toggle named after the session, pressed while it is pinned, and asks to pin or unpin it', async () => {
    const idle = renderCard(morning)
    await userEvent.click(screen.getByRole('button', { name: 'Pin Morning to the overlay' }))
    expect(screen.getByRole('button', { name: 'Pin Morning to the overlay' })).toHaveAttribute('aria-pressed', 'false')
    expect(idle.emitted()).toHaveProperty('pin')
    idle.unmount()

    const running = renderCard(pin(startedAgo(10 * MINUTE)))
    const toggle = screen.getByRole('button', { name: 'Pin Morning to the overlay' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(toggle)
    expect(running.emitted()).toHaveProperty('unpin')
    expect(running.emitted()).not.toHaveProperty('pin')
  })
})
