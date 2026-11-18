import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
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
