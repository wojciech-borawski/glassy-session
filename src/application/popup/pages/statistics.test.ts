import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, pause, start, type Timer } from '@/domain/timer/model/timer'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import { provideStoredTrackedTime } from '@/domain/tracking/stored-tracked-time'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { provideKeptTaskFilter } from '../kept-task-filter'
import Statistics from './statistics.vue'

const MINUTE = 60_000
const TUESDAY_NINE = new Date(2026, 10, 17, 9).getTime()

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

function renderStatistics(timers: readonly Timer[], trackedTime: TrackedTime, { query = '', repeatDayResults = {} }: { query?: string, repeatDayResults?: RepeatDayResults } = {}) {
  window.location.hash = `#/statistics${query}`
  const clock = createManualClock(TUESDAY_NINE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, trackedTime, repeatDayResults })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideDisplayClock(clock.now)
      provideKeptTaskFilter()
      return () => h(Statistics)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return { clock }
}

describe('the Statistics page', () => {
  test('with nothing tracked yet, says how time gets tracked and offers no other week', () => {
    renderStatistics([writeReport], {})

    expect(screen.getByText('Nothing tracked yet. Time is tracked while a task runs, on its own or in a focus session.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tracked time per day' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week before' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Week after' })).toBeDisabled()
  })

  test('shows the week that holds today: its days, its tasks and today\'s progress', () => {
    renderStatistics([writeReport], { 'write-report': { '2026-11-16': 30 * MINUTE, '2026-11-17': 45 * MINUTE } })

    expect(screen.getByRole('heading', { name: 'Nov 16\u2009–\u200922, 2026' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')).toHaveLength(7)
    expect(within(screen.getByRole('list', { name: 'By task' })).getByRole('listitem')).toHaveTextContent('Write report 1h 15m')
    expect(screen.getByRole('progressbar', { name: 'Write report today' })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.queryByText(/Nothing tracked yet/)).not.toBeInTheDocument()
  })

  test('leaves out today\'s progress when there is no task to show it for', () => {
    renderStatistics([], { 'old-task': { '2026-11-17': 45 * MINUTE } })

    expect(within(screen.getByRole('list', { name: 'By task' })).getByRole('listitem')).toHaveTextContent('Removed task 45m')
    expect(screen.queryByRole('heading', { name: 'Today' })).not.toBeInTheDocument()
  })

  test('moves between the weeks that have tracked time, with each week\'s totals and its tasks most tracked first, a removed task included', async () => {
    renderStatistics([writeReport, readMail], {
      'write-report': { '2026-11-10': 120 * MINUTE, '2026-11-16': 30 * MINUTE },
      'read-mail': { '2026-11-12': 20 * MINUTE, '2026-11-17': 60 * MINUTE },
      'old-task': { '2026-11-09': 10 * MINUTE, '2026-11-16': 45 * MINUTE }
    })
    const shown = () => ({
      week: screen.getByRole('heading', { level: 2 }).textContent,
      total: screen.getByText('Week total').nextElementSibling?.textContent,
      tasks: within(screen.getByRole('list', { name: 'By task' })).getAllByRole('listitem').map(row => row.textContent?.trim()),
      canGoBack: !(screen.getByRole('button', { name: 'Week before' }) as HTMLButtonElement).disabled,
      canGoForward: !(screen.getByRole('button', { name: 'Week after' }) as HTMLButtonElement).disabled
    })
    const thisWeek = {
      week: 'Nov 16\u2009–\u200922, 2026',
      total: '2h 15m',
      tasks: ['Read mail 1h', 'Removed task 45m', 'Write report 30m'],
      canGoBack: true,
      canGoForward: false
    }

    const atFirst = shown()
    await userEvent.click(screen.getByRole('button', { name: 'Week before' }))
    const weekBefore = shown()
    await userEvent.click(screen.getByRole('button', { name: 'Week after' }))

    expect(atFirst).toEqual(thisWeek)
    expect(weekBefore).toEqual({
      week: 'Nov 9\u2009–\u200915, 2026',
      total: '2h 30m',
      tasks: ['Write report 2h', 'Read mail 20m', 'Removed task 10m'],
      canGoBack: false,
      canGoForward: true
    })
    expect(shown()).toEqual(thisWeek)
  })

  test('narrowed to one task, shows only the tracked time of that task in the week, its totals and its progress today, and says it is the one chosen', async () => {
    renderStatistics([writeReport, readMail], {
      'write-report': { '2026-11-16': 30 * MINUTE },
      'read-mail': { '2026-11-17': 10 * MINUTE }
    }, { query: '?task=read-mail' })

    expect(await screen.findByRole('button', { name: 'Read mail', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All tasks', pressed: false })).toBeInTheDocument()
    expect(screen.getByText('Week total').nextElementSibling).toHaveTextContent('10m')
    expect(within(screen.getByRole('list', { name: 'By task' })).getAllByRole('listitem').map(row => row.textContent?.trim())).toEqual(['Read mail 10m'])
    expect(within(screen.getByRole('list', { name: 'Today' })).getAllByRole('listitem').map(row => row.textContent?.trim())).toEqual(['Read mail 10m of 15m'])
  })

  test('choosing a task in the filter narrows the week shown to it, and the filter stays while moving to another week', async () => {
    renderStatistics([writeReport, readMail], {
      'write-report': { '2026-11-10': 120 * MINUTE, '2026-11-16': 30 * MINUTE },
      'read-mail': { '2026-11-12': 20 * MINUTE, '2026-11-17': 60 * MINUTE }
    })
    const shown = () => ({
      week: screen.getByRole('heading', { level: 2 }).textContent,
      tasks: within(screen.getByRole('list', { name: 'By task' })).getAllByRole('listitem').map(row => row.textContent?.trim())
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Week before' }))
    await userEvent.click(screen.getByRole('button', { name: 'Write report' }))
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Write report' })).toHaveAttribute('aria-pressed', 'true'))
    const narrowed = shown()
    await userEvent.click(screen.getByRole('button', { name: 'Week after' }))

    expect(narrowed).toEqual({ week: 'Nov 9\u2009–\u200915, 2026', tasks: ['Write report 2h'] })
    expect(shown()).toEqual({ week: 'Nov 16\u2009–\u200922, 2026', tasks: ['Write report 30m'] })
  })

  test('shows how the repeat days of the week went for the tasks shown', async () => {
    renderStatistics([writeReport, readMail], { 'write-report': { '2026-11-16': 30 * MINUTE } }, {
      query: '?task=write-report',
      repeatDayResults: {
        'write-report': { '2026-11-16': { planned: 90 * MINUTE, tracked: 30 * MINUTE, finished: false }, '2026-11-09': { planned: 90 * MINUTE, tracked: 0, finished: false } },
        'read-mail': { '2026-11-16': { planned: 15 * MINUTE, tracked: 15 * MINUTE, finished: true } }
      }
    })

    await screen.findByRole('button', { name: 'Write report', pressed: true })
    const repeatDays = screen.getByRole('list', { name: 'Repeat days' })
    const writeReportDays = within(repeatDays).getByRole('list', { name: 'Write report: 0 of 1 repeat days finished' })
    expect(within(writeReportDays).getAllByRole('listitem').map(day => day.textContent?.trim())).toEqual(['Mon, Nov 16: 30m of 1h 30m, unfinished'])
    expect(within(repeatDays).queryByRole('list', { name: /Read mail/ })).not.toBeInTheDocument()
  })

  test('shows the result of a repeat day that a repeating task left by coming back today, before the background has stored it', async () => {
    const mondayNine = TUESDAY_NINE - 24 * 60 * MINUTE
    const gym = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'green' }, repeatDays: [1, 2] })
    const usedOnMonday = pause(start(gym, mondayNine).timer, mondayNine + 40 * MINUTE).timer

    renderStatistics([usedOnMonday], { gym: { '2026-11-16': 40 * MINUTE } })

    const gymDays = await screen.findByRole('list', { name: 'Gym: 0 of 1 repeat days finished' })
    expect(within(gymDays).getAllByRole('listitem').map(day => day.textContent?.trim())).toEqual(['Mon, Nov 16: 40m of 1h, unfinished'])
  })
})
