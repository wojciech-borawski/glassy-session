import { render, screen, within } from '@testing-library/vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { TaskRepeatDays } from './model/statistics'
import RepeatDays from './repeat-days.vue'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const gym = {
  taskId: 'gym',
  name: 'Gym',
  finished: 1,
  days: [
    { day: '2026-11-16', planned: HOUR, tracked: 40 * MINUTE, finished: false },
    { day: '2026-11-18', planned: HOUR, tracked: HOUR, finished: true }
  ]
}
const oldTask = { taskId: 'old-task', name: null, finished: 0, days: [{ day: '2026-11-17', planned: 30 * MINUTE, tracked: 0, finished: false }] }

function renderRepeatDays(tasks: readonly TaskRepeatDays[] = [gym, oldTask]) {
  return render(RepeatDays, { props: { tasks }, global: { plugins: [createAppI18n()] } })
}

describe('the repeat day results of a week', () => {
  test('lists each task with how many of its repeat days were finished, and each repeat day with its tracked and planned time and whether it was finished', () => {
    renderRepeatDays()

    const list = screen.getByRole('list', { name: 'Repeat days' })
    const gymDays = within(list).getByRole('list', { name: 'Gym: 1 of 2 repeat days finished' })
    expect(within(gymDays).getAllByRole('listitem').map((day) => day.textContent?.trim())).toEqual(['Mon, Nov 16: 40m of 1h, unfinished', 'Wed, Nov 18: 1h of 1h, finished'])
    const removedDays = within(list).getByRole('list', { name: 'Removed task: 0 of 1 repeat days finished' })
    expect(within(removedDays).getAllByRole('listitem').map((day) => day.textContent?.trim())).toEqual(['Tue, Nov 17: 0m of 30m, unfinished'])
  })

  test('says of a skipped repeat day that it was skipped, with its tracked and planned time, and does not count it as finished', () => {
    renderRepeatDays([{ taskId: 'read', name: 'Read', finished: 0, days: [{ day: '2026-11-17', planned: 4 * HOUR, tracked: 0, finished: false, skipped: true }] }])

    const readDays = screen.getByRole('list', { name: 'Read: 0 of 1 repeat days finished' })
    expect(within(readDays).getAllByRole('listitem').map((day) => day.textContent?.trim())).toEqual(['Tue, Nov 17: 0m of 4h, skipped'])
  })

  test('shows nothing when no repeat day falls in the week', () => {
    renderRepeatDays([])

    expect(screen.queryByRole('heading', { name: 'Repeat days' })).not.toBeInTheDocument()
  })
})
