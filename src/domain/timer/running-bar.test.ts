import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, pause, start, type Timer } from './model/timer'
import RunningBar from './running-bar.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })

function renderBar(timers: readonly Timer[], now = NINE) {
  return render(RunningBar, { props: { timers, now }, global: { plugins: [createAppI18n()] } })
}

describe('the running bar', () => {
  test('shows each running timer with its remaining time, and no timer that is not running', () => {
    const pausedMail = pause(start(readMail, NINE - 2 * MINUTE).timer, NINE - MINUTE).timer
    renderBar([start(writeReport, NINE - 10 * MINUTE).timer, readMail, pausedMail, start(tea, NINE - MINUTE - 30_000).timer])

    const bar = screen.getByRole('region', { name: 'Counting down' })
    const [report, teaItem, ...others] = within(bar).getAllByRole('listitem') as HTMLElement[]
    expect(others).toEqual([])
    expect(within(report as HTMLElement).getByText('Write report')).toBeInTheDocument()
    expect(within(report as HTMLElement).getByText('1:20:00')).toBeInTheDocument()
    expect(within(teaItem as HTMLElement).getByText('Tea')).toBeInTheDocument()
    expect(within(teaItem as HTMLElement).getByText('02:30')).toBeInTheDocument()
  })

  test('asks to pause the timer whose pause button is chosen', async () => {
    const runningTea = start(tea, NINE - MINUTE).timer
    const { emitted } = renderBar([start(writeReport, NINE - MINUTE).timer, runningTea])

    await userEvent.click(screen.getByRole('button', { name: 'Pause Tea' }))

    expect(emitted('pause')).toEqual([[runningTea]])
  })

  test('is not there while nothing runs', () => {
    renderBar([writeReport, pause(start(tea, NINE - MINUTE).timer, NINE).timer])

    expect(screen.queryByRole('region', { name: 'Counting down' })).not.toBeInTheDocument()
  })

  test('shows what is placed before the running timers, such as running focus sessions, even when no timer runs', () => {
    render(RunningBar, {
      props: { timers: [writeReport], now: NINE },
      slots: { before: '<li>Morning</li>' },
      global: { plugins: [createAppI18n()] }
    })

    const bar = screen.getByRole('region', { name: 'Counting down' })
    expect(within(bar).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Morning'])
  })

  test('scrolls its chips sideways with a wheel turned up or down when they do not fit, and leaves the wheel alone when they fit', () => {
    renderBar([start(writeReport, NINE - MINUTE).timer, start(tea, NINE - MINUTE).timer])
    const chips = within(screen.getByRole('region', { name: 'Counting down' })).getByRole('list')
    Object.defineProperty(chips, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(chips, 'scrollWidth', { value: 300, configurable: true })

    expect(chips.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }))).toBe(true)
    expect(chips.scrollLeft).toBe(0)

    Object.defineProperty(chips, 'scrollWidth', { value: 500, configurable: true })

    expect(chips.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }))).toBe(false)
    expect(chips.scrollLeft).toBe(80)
  })

  test('scrolls its chips sideways by lines of about 16 pixels for a wheel that turns in lines, as Firefox gives it', () => {
    renderBar([start(writeReport, NINE - MINUTE).timer, start(tea, NINE - MINUTE).timer])
    const chips = within(screen.getByRole('region', { name: 'Counting down' })).getByRole('list')
    Object.defineProperty(chips, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(chips, 'scrollWidth', { value: 500, configurable: true })

    chips.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE, bubbles: true, cancelable: true }))

    expect(chips.scrollLeft).toBe(48)
  })
})
