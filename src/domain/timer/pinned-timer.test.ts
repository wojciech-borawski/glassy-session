import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, pause, start, type Timer } from './model/timer'
import PinnedTimer from './pinned-timer.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

function renderRow(timer: Timer, now = NINE, inSession?: string) {
  return render(PinnedTimer, { props: { timer, now, inSession }, global: { plugins: [createAppI18n()] } })
}

describe('a pinned timer in the overlay', () => {
  test('of a task that a focus session runs says it is in that session, with the time it has left, and offers no start', () => {
    const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
    renderRow({ ...readMail, remainingTime: 9 * MINUTE }, NINE, 'Morning')

    const row = screen.getByRole('listitem', { name: 'Read mail' })
    expect(row).toHaveTextContent('09:00')
    expect(row).toHaveTextContent('In Morning')
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
  })

  test('shows its name and its remaining time for the moment it is drawn for, and asks to start it', async () => {
    const { emitted } = renderRow(pause(start(tea, NINE - MINUTE).timer, NINE - 30_000).timer)

    const row = screen.getByRole('listitem', { name: 'Tea' })
    expect(within(row).getByText('03:30')).toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Start Tea' }))

    expect(emitted('start')).toHaveLength(1)
  })

  test('offers to pause a running timer and follows the moment it is drawn for', async () => {
    const { emitted, rerender } = renderRow(start(tea, NINE).timer, NINE + MINUTE)
    const row = screen.getByRole('listitem', { name: 'Tea' })

    await rerender({ now: NINE + 90_000 })
    expect(within(row).getByText('02:30')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Start Tea' })).not.toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Pause Tea' }))

    expect(emitted('pause')).toHaveLength(1)
  })

  test('marks the row of a running timer as running', () => {
    renderRow(start(tea, NINE).timer, NINE + MINUTE)

    expect(screen.getByRole('listitem', { name: 'Tea' })).toHaveClass('n-list-row--running')
  })

  test('does not mark the row of a paused timer as running', () => {
    renderRow(pause(start(tea, NINE - MINUTE).timer, NINE - 30_000).timer)

    expect(screen.getByRole('listitem', { name: 'Tea' })).not.toHaveClass('n-list-row--running')
  })

  test('does not mark the row of a task that a focus session runs as running', () => {
    const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
    renderRow({ ...readMail, remainingTime: 9 * MINUTE }, NINE, 'Morning')

    expect(screen.getByRole('listitem', { name: 'Read mail' })).not.toHaveClass('n-list-row--running')
  })

  test('says a finished timer is finished and offers nothing to run', () => {
    renderRow(start(tea, NINE).timer, NINE + 5 * MINUTE)

    const row = screen.getByRole('listitem', { name: 'Tea' })
    expect(within(row).getByText('Finished')).toBeInTheDocument()
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
  })
})
