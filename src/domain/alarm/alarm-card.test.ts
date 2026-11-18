import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import AlarmCard from './alarm-card.vue'
import { createAlarm, type Alarm } from './model/alarm'
import type { Weekday } from '@/utils/time/calendar'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })

function renderCard(alarm: Alarm) {
  return render(AlarmCard, { props: { alarm }, global: { plugins: [createAppI18n()] } })
}

describe('the alarm card', () => {
  test('shows the name of the alarm, its time and the days it repeats on', () => {
    renderCard(wakeUp)

    const card = screen.getByRole('article', { name: 'Wake up' })
    expect(within(card).getByText('07:30')).toBeInTheDocument()
    expect(within(card).getByText('Weekdays')).toBeInTheDocument()
  })

  test.each([
    [[0, 1, 2, 3, 4, 5, 6], 'Every day'],
    [[0, 6], 'Weekends'],
    [[1, 3, 5], 'Mon, Wed, Fri'],
    [[0, 2], 'Sun, Tue']
  ] satisfies [Weekday[], string][])('an alarm repeating on %j reads %s', (repeatDays, text) => {
    renderCard({ ...wakeUp, days: { kind: 'repeating', repeatDays } })

    expect(within(screen.getByRole('article', { name: 'Wake up' })).getByText(text)).toBeInTheDocument()
  })

  test('a one-time alarm shows the date it rings on', () => {
    renderCard({ ...wakeUp, name: 'Dentist', days: { kind: 'one-time', date: '2026-11-20' } })

    expect(within(screen.getByRole('article', { name: 'Dentist' })).getByText('Once, Fri, Nov 20, 2026')).toBeInTheDocument()
  })

  test('a switched on alarm offers to switch it off with a switch named for the alarm', async () => {
    const { emitted } = renderCard(wakeUp)
    const ringSwitch = screen.getByRole('switch', { name: 'Ring Wake up' })

    expect(ringSwitch).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(ringSwitch)

    expect(emitted('switchOff')).toEqual([[]])
    expect(emitted('switchOn')).toBeUndefined()
  })

  test('a switched off alarm offers to switch it on, also from the keyboard', async () => {
    const { emitted } = renderCard({ ...wakeUp, switchedOn: false })
    const ringSwitch = screen.getByRole('switch', { name: 'Ring Wake up' })

    expect(ringSwitch).toHaveAttribute('aria-checked', 'false')
    ringSwitch.focus()
    await userEvent.keyboard(' ')

    expect(emitted('switchOn')).toEqual([[]])
  })

  test.each([
    { alarm: { ...wakeUp, switchedOn: false }, is: 'switched off', dims: true },
    { alarm: wakeUp, is: 'switched on', dims: false }
  ])('a $is alarm dims its time, name and repeat days: $dims, and never its switch or its edit button', ({ alarm, dims }) => {
    renderCard(alarm)
    const card = screen.getByRole('article', { name: 'Wake up' })
    const isDimmed = (element: Element) => element.closest('.alarm-card__dimmed') !== null

    expect(card).not.toHaveClass('n-card--greyed')
    expect([within(card).getByText('07:30'), within(card).getByText('Wake up'), within(card).getByText('Weekdays')].map(isDimmed)).toEqual([dims, dims, dims])
    expect([within(card).getByRole('switch', { name: 'Ring Wake up' }), within(card).getByRole('button', { name: 'Edit Wake up' })].map(isDimmed)).toEqual([false, false])
  })

  test('offers to edit the alarm with a button named for it', async () => {
    const { emitted } = renderCard(wakeUp)

    await userEvent.click(screen.getByRole('button', { name: 'Edit Wake up' }))

    expect(emitted('edit')).toEqual([[]])
  })
})
