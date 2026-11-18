import { render, screen, within } from '@testing-library/vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer } from '../timer/model/timer'
import { totalsFor } from './model/statistics'
import WeekChart from './week-chart.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const timers = [writeReport, readMail]

const week = { first: '2026-11-16', last: '2026-11-22' }
const trackedTime = {
  'write-report': { '2026-11-16': 90 * MINUTE, '2026-11-18': 20 * MINUTE },
  'read-mail': { '2026-11-16': 30 * MINUTE, '2026-11-18': 40 * MINUTE },
  'old-task': { '2026-11-18': 10 * MINUTE }
}

function renderChart(today = '2026-11-18') {
  return render(WeekChart, { props: { totals: totalsFor(trackedTime, week, timers), timers, today }, global: { plugins: [createAppI18n()] } })
}

/** The text a screen reader reads in an element: everything outside the parts hidden from it. */
function spokenText(element: Element): string {
  if (element.getAttribute('aria-hidden') === 'true') return ''
  return Array.from(element.childNodes)
    .map(node => node instanceof Element ? spokenText(node) : node.textContent ?? '')
    .join('')
    .trim()
}

describe('the week chart', () => {
  test('reads each day of the week with its tracked time, the days with nothing tracked too', () => {
    renderChart()

    const days = within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')
    expect(days.map(spokenText)).toEqual([
      'Monday, November 16: 2h',
      'Tuesday, November 17: nothing tracked',
      'Wednesday, November 18: 1h 10m',
      'Thursday, November 19: nothing tracked',
      'Friday, November 20: nothing tracked',
      'Saturday, November 21: nothing tracked',
      'Sunday, November 22: nothing tracked'
    ])
  })

  test('draws each day in the colours of its tasks from the most tracked up, with a removed task in a neutral colour', () => {
    const { container } = renderChart()

    const tracks = Array.from(container.querySelectorAll('.n-stacked-bar-chart__track'))
    const colours = tracks.map(track => Array.from(track.children as HTMLCollectionOf<HTMLElement>).map(part => part.style.backgroundColor))
    expect(colours).toEqual([
      ['#2f7dd1', '#2e9e5b'],
      [],
      ['#2e9e5b', '#2f7dd1', 'var(--n-text-muted)'],
      [], [], [], []
    ])
  })

  test('marks today when it is in the week', () => {
    renderChart('2026-11-17')

    const days = within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')
    expect(days.map(day => day.getAttribute('aria-current'))).toEqual([null, 'true', null, null, null, null, null])
  })

  test('says how much was tracked in the whole week', () => {
    renderChart()

    const total = screen.getByText('Week total').parentElement as HTMLElement
    expect(within(total).getByText('3h 10m')).toBeInTheDocument()
  })
})
