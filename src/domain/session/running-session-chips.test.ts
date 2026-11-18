import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer } from '../timer/model/timer'
import { createFocusSession, pause, start, taskTimesAt, type FocusSession } from './model/focus-session'
import RunningSessionChips from './running-session-chips.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tasks = [writeReport, answerEmail]

const sessionOf = (id: string, name: string, taskId: string) => createFocusSession(
  { id, name, taskIds: [taskId], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' },
  taskTimesAt(tasks, NINE)
)
const startedAgo = (session: FocusSession, ago: number) => start(session, taskTimesAt(tasks, NINE - ago), NINE - ago).session

const morning = startedAgo(sessionOf('morning', 'Morning', 'write-report'), 27 * MINUTE)
const mail = pause(startedAgo(sessionOf('mail', 'Mail', 'answer-email'), 5 * MINUTE), NINE).session
const later = sessionOf('later', 'Later', 'answer-email')

function renderChips(sessions: readonly FocusSession[]) {
  return render(RunningSessionChips, { props: { sessions, now: NINE }, global: { plugins: [createAppI18n()] } })
}

describe('the running focus session chips', () => {
  test('show each running focus session with what is left of its focus step or break, and no session that is paused or not started', () => {
    renderChips([morning, mail, later])

    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual(['Morning03:00'])
  })

  test('ask to pause the session whose pause button is chosen', async () => {
    const { emitted } = renderChips([morning])

    await userEvent.click(screen.getByRole('button', { name: 'Pause Morning' }))

    expect(emitted('pause')).toEqual([[morning]])
  })
})
