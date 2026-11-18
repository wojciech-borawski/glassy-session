import { render, screen, within } from '@testing-library/vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer } from '../timer/model/timer'
import DayProgress from './day-progress.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

const trackedTime = {
  'write-report': { '2026-11-16': 60 * MINUTE, '2026-11-17': 45 * MINUTE },
  'read-mail': { '2026-11-17': 20 * MINUTE }
}

describe('the day progress of each task', () => {
  test('shows how much of each task\'s planned time was tracked today, past the whole when it ran longer, and leaves out plain timers', () => {
    render(DayProgress, { props: { trackedTime, timers: [writeReport, tea, readMail], today: '2026-11-17' }, global: { plugins: [createAppI18n()] } })

    const rows = within(screen.getByRole('list', { name: 'Today' })).getAllByRole('listitem')
    expect(rows.map(row => row.textContent?.trim())).toEqual(['Write report 45m of 1h 30m', 'Read mail 20m of 15m'])
    expect(screen.getByRole('progressbar', { name: 'Write report today' })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByRole('progressbar', { name: 'Read mail today' })).toHaveAttribute('aria-valuenow', '100')
  })
})
