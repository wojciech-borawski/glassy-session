import { render, screen, within } from '@testing-library/vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer } from '../timer/model/timer'
import TaskTotals from './task-totals.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

const tasks = [
  { taskId: 'read-mail', name: 'Read mail', tracked: 110 * MINUTE },
  { taskId: 'write-report', name: 'Write report', tracked: 70 * MINUTE },
  { taskId: 'old-task', name: null, tracked: 10 * MINUTE }
]

function renderTotals(shown = tasks) {
  return render(TaskTotals, { props: { tasks: shown, timers: [writeReport, readMail] }, global: { plugins: [createAppI18n()] } })
}

describe('the tracked time per task', () => {
  test('lists the tasks in the order given with their tracked time, in their colours, and a removed task as Removed task', () => {
    renderTotals()

    const rows = within(screen.getByRole('list', { name: 'By task' })).getAllByRole('listitem')
    expect(rows.map(row => row.textContent?.trim())).toEqual(['Read mail 1h 50m', 'Write report 1h 10m', 'Removed task 10m'])
    expect(rows.map(row => (row.querySelector('[aria-hidden="true"]') as HTMLElement | null)?.style.backgroundColor)).toEqual(['#2e9e5b', '#2f7dd1', 'var(--n-text-muted)'])
  })

  test('says so when nothing was tracked', () => {
    renderTotals([])

    expect(screen.queryByRole('list', { name: 'By task' })).not.toBeInTheDocument()
    expect(screen.getByText('Nothing tracked in this week.')).toBeInTheDocument()
  })
})
