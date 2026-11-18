import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { icons } from '@/ui/n-icon/icons'
import { createTimer } from '../timer/model/timer'
import { createFocusSession, pause, start, taskTimesAt, type FocusSession } from './model/focus-session'
import PinnedSession from './pinned-session.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

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
}, taskTimesAt(tasks, NINE))

const startedAgo = (ago: number) => start(morning, taskTimesAt(tasks, NINE - ago), NINE - ago).session

function renderRow(session: FocusSession, now = NINE) {
  return render(PinnedSession, { props: { session, tasks, now }, global: { plugins: [createAppI18n()] } })
}

describe('a pinned focus session in the overlay', () => {
  test('shows a running session with what is left of its current focus step and which task it is on, and asks to pause it', async () => {
    const { emitted } = renderRow(startedAgo(10 * MINUTE))

    const row = screen.getByRole('listitem', { name: 'Morning' })
    expect(within(row).getByText('15:00')).toBeInTheDocument()
    expect(within(row).getByText('Focus: Write report')).toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Pause Morning' }))

    expect(emitted('pause')).toHaveLength(1)
  })

  test('marks the row of a session running in a break as running', () => {
    renderRow(startedAgo(27 * MINUTE))

    expect(screen.getByRole('listitem', { name: 'Morning' })).toHaveClass('n-list-row--running')
  })

  test('marks the row of a session running in a break with the calm look of a break, not the accent of a focus step', () => {
    renderRow(startedAgo(27 * MINUTE))

    expect(screen.getByRole('listitem', { name: 'Morning' })).toHaveClass('n-list-row--calm')
  })

  test('shows a cup instead of the focus target while on a break', () => {
    const { container } = renderRow(startedAgo(27 * MINUTE))

    expect(container.querySelector('svg path')).toHaveAttribute('d', icons.cup)
  })

  test('paused in a break, keeps the look of a paused row and shows the cup', () => {
    const { container } = renderRow(pause(startedAgo(27 * MINUTE), NINE - MINUTE).session)

    const row = screen.getByRole('listitem', { name: 'Morning' })
    expect(row).not.toHaveClass('n-list-row--running')
    expect(within(row).getByText('Paused in a break, next: Write report')).toBeInTheDocument()
    expect(container.querySelector('svg path')).toHaveAttribute('d', icons.cup)
  })

  test('marks the row of a session running in a focus step as running, in the accent and with the focus target', () => {
    const { container } = renderRow(startedAgo(10 * MINUTE))

    const row = screen.getByRole('listitem', { name: 'Morning' })
    expect(row).toHaveClass('n-list-row--running')
    expect(row).not.toHaveClass('n-list-row--calm')
    expect(container.querySelector('svg path')).toHaveAttribute('d', icons.target)
  })

  test('does not mark the row of a paused session as running', () => {
    renderRow(pause(startedAgo(10 * MINUTE), NINE - 5 * MINUTE).session)

    expect(screen.getByRole('listitem', { name: 'Morning' })).not.toHaveClass('n-list-row--running')
  })

  test('does not mark the row of a session that has not started as running', () => {
    renderRow(morning)

    expect(screen.getByRole('listitem', { name: 'Morning' })).not.toHaveClass('n-list-row--running')
  })

  test('asks to resume a paused session, and says where it is paused', async () => {
    const { emitted } = renderRow(pause(startedAgo(10 * MINUTE), NINE - 5 * MINUTE).session)

    const row = screen.getByRole('listitem', { name: 'Morning' })
    expect(within(row).getByText('20:00')).toBeInTheDocument()
    expect(within(row).getByText('Paused: Write report')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Pause Morning' })).not.toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Resume Morning' }))

    expect(emitted('resume')).toHaveLength(1)
  })

  test('shows a session that has not started with how long it would take, and asks to start it', async () => {
    const { emitted } = renderRow(morning)

    const row = screen.getByRole('listitem', { name: 'Morning' })
    expect(within(row).getByText('1h 35m')).toBeInTheDocument()
    expect(within(row).queryByText(/Focus:/)).not.toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Start Morning' }))

    expect(emitted('start')).toHaveLength(1)
  })
})
