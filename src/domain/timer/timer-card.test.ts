import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { RepeatDayResult } from '../tracking/model/repeat-day-results'
import { createTimer, markDone, pause, pin, start, type NewTimer, type Timer } from './model/timer'
import TimerCard from './timer-card.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport: NewTimer = { id: 'write-report', name: 'Write report', description: 'Chapters 3 to 5', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } }

function renderCard(timer: Timer, now = NINE, inSession?: string, lastTime?: RepeatDayResult) {
  return render(TimerCard, { props: { timer, now, inSession, lastTime }, global: { plugins: [createAppI18n()] } })
}

function buttonNames(card: HTMLElement) {
  return within(card.querySelector('footer') ?? card).getAllByRole('button').filter((button) => !button.hasAttribute('aria-pressed')).map((button) => button.getAttribute('aria-label') ?? button.textContent)
}

describe('the timer card', () => {
  test('of a task that a focus session runs says it is in that session, shows the time it has left, and offers only to edit it', () => {
    renderCard({ ...createTimer(writeReport), remainingTime: 70 * MINUTE }, NINE, 'Morning')

    const card = screen.getByRole('article', { name: 'Write report' })
    expect(within(card).getByText('In Morning')).toBeInTheDocument()
    expect(within(card).getByText('1:10:00')).toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Edit Write report'])
    expect(within(card).getByRole('button', { name: 'Pin Write report to the overlay' })).toBeInTheDocument()
  })

  test('of a task that the steps of a running focus session used up offers no Undo done and only to edit it', () => {
    renderCard({ ...createTimer(writeReport), remainingTime: 0, done: { at: NINE - MINUTE, remainingTimeBefore: 0 } }, NINE, 'Morning')

    const card = screen.getByRole('article', { name: 'Write report' })
    expect(within(card).getByText('In Morning')).toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Edit Write report'])
  })

  test('shows the name, whether it is a task or a timer, the description and the planned time', () => {
    renderCard(createTimer(writeReport))

    const card = screen.getByRole('article', { name: 'Write report' })
    expect(within(card).getByText('Task')).toBeInTheDocument()
    expect(within(card).getByText('Chapters 3 to 5')).toBeInTheDocument()
    expect(within(card).getByText('of 1h 30m planned')).toBeInTheDocument()
  })

  test('shows the remaining time for the moment it is drawn for, and follows that moment', async () => {
    const { rerender } = renderCard(start(createTimer(writeReport), NINE).timer, NINE + 10 * MINUTE)
    const card = screen.getByRole('article', { name: 'Write report' })
    const shownFirst = within(card).getByText('1:20:00')

    await rerender({ now: NINE + 25 * MINUTE + 30_000 })

    expect(shownFirst).toBeInTheDocument()
    expect(within(card).getByText('1:04:30')).toBeInTheDocument()
  })

  test('shows how much of the planned time is used as a progress bar named after the timer', () => {
    renderCard(start(createTimer(writeReport), NINE).timer, NINE + 30 * MINUTE)

    expect(screen.getByRole('progressbar', { name: 'Write report progress' })).toHaveAttribute('aria-valuenow', '33')
  })

  test('offers to start, mark done or edit a task that has not started, naming the task, and asks for what is chosen', async () => {
    const { emitted } = renderCard(createTimer(writeReport))
    const card = screen.getByRole('article', { name: 'Write report' })

    expect(buttonNames(card)).toEqual(['Start Write report', 'Mark Write report done', 'Edit Write report'])
    await userEvent.click(within(card).getByRole('button', { name: 'Start Write report' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Mark Write report done' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Edit Write report' }))

    expect(emitted('start')).toHaveLength(1)
    expect(emitted('markDone')).toHaveLength(1)
    expect(emitted('edit')).toHaveLength(1)
  })

  test('offers to pause, reset, mark done or edit a running task, and asks for what is chosen', async () => {
    const { emitted } = renderCard(start(createTimer(writeReport), NINE).timer, NINE + MINUTE)
    const card = screen.getByRole('article', { name: 'Write report' })

    expect(buttonNames(card)).toEqual(['Pause Write report', 'Reset Write report', 'Mark Write report done', 'Edit Write report'])
    await userEvent.click(within(card).getByRole('button', { name: 'Pause Write report' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Reset Write report' }))

    expect(emitted('pause')).toHaveLength(1)
    expect(emitted('reset')).toHaveLength(1)
  })

  test('offers to start again, reset, mark done or edit a paused task', () => {
    const paused = pause(start(createTimer(writeReport), NINE).timer, NINE + MINUTE).timer
    renderCard(paused, NINE + 2 * MINUTE)

    expect(buttonNames(screen.getByRole('article', { name: 'Write report' }))).toEqual(['Start Write report', 'Reset Write report', 'Mark Write report done', 'Edit Write report'])
  })

  test('greys a finished task, says it is done, offers only to undo done or edit it, and asks for undo done when chosen', async () => {
    const { emitted } = renderCard(start(createTimer(writeReport), NINE).timer, NINE + 2 * 90 * MINUTE)
    const card = screen.getByRole('article', { name: 'Write report' })

    expect(card).toHaveClass('n-card--greyed')
    expect(within(card).getByText('Done')).toBeInTheDocument()
    expect(buttonNames(card)).toEqual(['Undo done for Write report', 'Edit Write report'])
    await userEvent.click(within(card).getByRole('button', { name: 'Undo done for Write report' }))

    expect(emitted('undoDone')).toHaveLength(1)
    expect(emitted('reset')).toBeUndefined()
  })

  test('says a finished repeating task is done for the day', () => {
    renderCard(markDone(createTimer({ ...writeReport, repeatDays: [1, 3] }), NINE).timer)

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Done for the day')).toBeInTheDocument()
  })

  test('says on which days a repeating task repeats', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [1, 3] }))

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByRole('img', { name: 'Repeats on Monday and Wednesday' })).toBeInTheDocument()
  })

  test('shows the repeat day letters from Monday to Sunday, like the day picker, marking the repeat days', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [0, 1] }))

    const letters = Array.from(screen.getByRole('img', { name: 'Repeats on Sunday and Monday' }).children)
    expect(letters.map((letter) => letter.textContent).join('')).toBe('MTWTFSS')
    expect(letters.map((letter) => letter.classList.contains('timer-card__day--repeats'))).toEqual([true, false, false, false, false, false, true])
  })

  test('never offers to mark a plain timer done, and offers to reset it once finished', () => {
    const tea = createTimer({ ...writeReport, kind: 'timer' })
    renderCard(tea)
    renderCard(start(tea, NINE).timer, NINE + 2 * 90 * MINUTE)

    const [idle, finished] = screen.getAllByRole('article', { name: 'Write report' })
    expect(buttonNames(idle as HTMLElement)).toEqual(['Start Write report', 'Edit Write report'])
    expect(buttonNames(finished as HTMLElement)).toEqual(['Reset Write report', 'Edit Write report'])
  })

  test('offers a pin toggle named after the timer, pressed while it is pinned, and asks to pin or unpin it', async () => {
    const { emitted } = renderCard(createTimer(writeReport))
    renderCard(pin(createTimer({ ...writeReport, name: 'Tea' })).timer)

    const pinReport = screen.getByRole('button', { name: 'Pin Write report to the overlay' })
    const pinTea = screen.getByRole('button', { name: 'Pin Tea to the overlay' })
    expect(pinReport).toHaveAttribute('aria-pressed', 'false')
    expect(pinTea).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(pinReport)
    expect(emitted()).toHaveProperty('pin')
    expect(emitted()).not.toHaveProperty('unpin')
  })

  test('asks to unpin a pinned timer when its pin toggle is chosen', async () => {
    const { emitted } = renderCard(pin(createTimer(writeReport)).timer)

    await userEvent.click(screen.getByRole('button', { name: 'Pin Write report to the overlay' }))

    expect(emitted()).toHaveProperty('unpin')
    expect(emitted()).not.toHaveProperty('pin')
  })

  test('says a finished timer is finished', () => {
    renderCard(start(createTimer({ ...writeReport, kind: 'timer' }), NINE).timer, NINE + 2 * 90 * MINUTE)

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Finished')).toBeInTheDocument()
  })

  test('of a repeating task that has not started yet says how its repeat day before went: the time tracked of the time planned', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [2, 4] }), NINE, undefined, { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false })

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Last time: 40m of 1h')).toBeInTheDocument()
  })

  test('of a repeating task whose repeat day before was finished says so', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [2, 4] }), NINE, undefined, { planned: 60 * MINUTE, tracked: 70 * MINUTE, finished: true })

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Last time: finished')).toBeInTheDocument()
  })

  test('of a repeating task whose repeat day before was skipped with nothing tracked says it was skipped', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [2, 4] }), NINE, undefined, { planned: 4 * 60 * MINUTE, tracked: 0, finished: false, skipped: true })

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Last time: skipped')).toBeInTheDocument()
  })

  test('of a repeating task whose repeat day before was skipped after some time tracked says how much and that it was skipped', () => {
    renderCard(createTimer({ ...writeReport, repeatDays: [2, 4] }), NINE, undefined, { planned: 4 * 60 * MINUTE, tracked: 40 * MINUTE, finished: false, skipped: true })

    expect(within(screen.getByRole('article', { name: 'Write report' })).getByText('Last time: 40m of 4h, skipped')).toBeInTheDocument()
  })

  test('of a repeating task says nothing of last time once it has started or is done', () => {
    const lastTime = { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false }
    const task = createTimer({ ...writeReport, repeatDays: [2, 4] })
    renderCard(start(task, NINE).timer, NINE + MINUTE, undefined, lastTime)
    renderCard(markDone(task, NINE).timer, NINE + MINUTE, undefined, lastTime)

    expect(screen.queryByText(/Last time/)).not.toBeInTheDocument()
  })

  describe('Skip today', () => {
    /** Tuesday 9:00 on the local clock, so the repeat day does not depend on the machine's time zone. */
    const TUESDAY = new Date(2026, 10, 17, 9).getTime()
    const reading = createTimer({ ...writeReport, id: 'read', name: 'Read', repeatDays: [2, 4] })

    test('is offered for a repeating task on one of its repeat days, named after the task, and asked for when chosen', async () => {
      const { emitted } = renderCard(reading, TUESDAY)
      const card = screen.getByRole('article', { name: 'Read' })

      expect(buttonNames(card)).toEqual(['Start Read', 'Mark Read done', 'Skip Read today', 'Edit Read'])
      await userEvent.click(within(card).getByRole('button', { name: 'Skip Read today' }))

      expect(emitted('skipToday')).toHaveLength(1)
    })

    test('is the one thing besides Edit offered while the run of a focus session uses the task', () => {
      renderCard({ ...reading, remainingTime: 70 * MINUTE }, TUESDAY, 'Morning')

      expect(buttonNames(screen.getByRole('article', { name: 'Read' }))).toEqual(['Skip Read today', 'Edit Read'])
    })

    test.each([
      ['a repeating task done for the day', markDone(reading, TUESDAY).timer, TUESDAY],
      ['a repeating task on a day that is not one of its repeat days', reading, TUESDAY + 24 * 60 * MINUTE],
      ['a one-time task', createTimer({ ...writeReport, id: 'read', name: 'Read' }), TUESDAY],
      ['a timer', createTimer({ ...writeReport, id: 'read', name: 'Read', kind: 'timer' }), TUESDAY]
    ])('is not offered for %s', (_, timer, now) => {
      renderCard(timer, now)

      expect(within(screen.getByRole('article', { name: 'Read' })).queryByRole('button', { name: 'Skip Read today' })).not.toBeInTheDocument()
    })
  })

  test('of a task offers its statistics', async () => {
    const { emitted } = renderCard(createTimer(writeReport))

    await userEvent.click(within(screen.getByRole('article', { name: 'Write report' })).getByRole('button', { name: 'Statistics for Write report' }))

    expect(emitted('statistics')).toHaveLength(1)
  })

  test('of a timer offers no statistics, since a timer is not tracked', () => {
    renderCard(createTimer({ ...writeReport, name: 'Tea', kind: 'timer' }))

    expect(within(screen.getByRole('article', { name: 'Tea' })).queryByRole('button', { name: /Statistics/ })).not.toBeInTheDocument()
  })
})
