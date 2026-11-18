import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, markDone, pin, start, type Timer } from './model/timer'
import TimerList from './timer-list.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

function renderList(timers: readonly Timer[], now = NINE, usedInRun?: ReadonlyMap<string, Readonly<{ id: string, name: string }>>) {
  return render(TimerList, { props: { timers, now, usedInRun }, global: { plugins: [createAppI18n()] } })
}

function cardsIn(list: HTMLElement | undefined, ...names: string[]) {
  const inList = within(list as HTMLElement)
  return { all: inList.getAllByRole('article'), named: names.map((name) => inList.getByRole('article', { name })) }
}

describe('the timer list', () => {
  test('says on the card of each task that a focus session runs which session it is in', () => {
    renderList([writeReport, readMail, tea], NINE, new Map([['read-mail', { id: 'morning', name: 'Morning' }]]))

    expect(within(screen.getByRole('article', { name: 'Read mail' })).getByText('In Morning')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Write report' })).queryByText(/^In /)).not.toBeInTheDocument()
  })

  test('lists the timers that are not finished first, and the finished ones after them under Finished', () => {
    const finishedTea = start(tea, NINE - 5 * MINUTE).timer
    renderList([finishedTea, writeReport, readMail])

    const [left, finished] = screen.getAllByRole('list')
    const leftCards = cardsIn(left, 'Write report', 'Read mail')
    const finishedCards = cardsIn(finished, 'Tea')
    expect(leftCards.all).toEqual(leftCards.named)
    expect(finishedCards.all).toEqual(finishedCards.named)
    expect(screen.getByRole('heading', { name: 'Finished' })).toBeInTheDocument()
  })

  test('says how to add one when there are no timers', () => {
    renderList([])

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('No timers or tasks yet. Choose New to add one.')).toBeInTheDocument()
  })

  test('asks for what is chosen on a card, with the timer of that card', async () => {
    const runningReport = start(writeReport, NINE - MINUTE).timer
    const finishedTea = start(tea, NINE - 5 * MINUTE).timer
    const { emitted } = renderList([runningReport, readMail, finishedTea])

    await userEvent.click(screen.getByRole('button', { name: 'Start Read mail' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pause Write report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset Tea' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit Write report' }))

    expect(emitted()).toMatchObject({ start: [[readMail]], pause: [[runningReport]], reset: [[finishedTea]], edit: [[runningReport]] })
  })

  test('asks to mark a task done, and to undo done for a done task, with the task of that card', async () => {
    const doneReport = markDone(writeReport, NINE).timer
    const { emitted } = renderList([readMail, doneReport])

    await userEvent.click(screen.getByRole('button', { name: 'Mark Read mail done' }))
    await userEvent.click(screen.getByRole('button', { name: 'Undo done for Write report' }))

    expect(emitted()).toMatchObject({ markDone: [[readMail]], undoDone: [[doneReport]] })
  })

  test('asks to pin or unpin with the timer of that card', async () => {
    const pinnedTea = pin(tea).timer
    const { emitted } = renderList([readMail, pinnedTea])

    await userEvent.click(screen.getByRole('button', { name: 'Pin Read mail to the overlay' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pin Tea to the overlay' }))

    expect(emitted()).toMatchObject({ pin: [[readMail]], unpin: [[pinnedTea]] })
  })

  test('says on the card of each task how its repeat day before went, and asks for the statistics of the task chosen', async () => {
    const { emitted } = render(TimerList, {
      props: { timers: [writeReport, readMail], now: NINE, lastTimes: new Map([['read-mail', { planned: 15 * MINUTE, tracked: 10 * MINUTE, finished: false }]]) },
      global: { plugins: [createAppI18n()] }
    })

    expect(within(screen.getByRole('article', { name: 'Read mail' })).getByText('Last time: 10m of 15m')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Write report' })).queryByText(/Last time/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Statistics for Read mail' }))
    expect(emitted('statistics')).toEqual([[readMail]])
  })
})
