import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import AlarmList from './alarm-list.vue'
import { createAlarm, type Alarm } from './model/alarm'

const HOUR = 3_600_000

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })
const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })

function renderList(alarms: readonly Alarm[]) {
  return render(AlarmList, { props: { alarms }, global: { plugins: [createAppI18n()] } })
}

describe('the alarm list', () => {
  test('shows a card for each alarm in the order they are stored', () => {
    renderList([wakeUp, dentist])

    expect(within(screen.getByRole('list')).getAllByRole('article')).toEqual([
      screen.getByRole('article', { name: 'Wake up' }),
      screen.getByRole('article', { name: 'Dentist' })
    ])
  })

  test('with no alarms it says how to add one', () => {
    renderList([])

    expect(screen.getByText('No alarms yet. Choose New to add one.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('passes on switching an alarm on or off and editing it, with the alarm', async () => {
    const { emitted } = renderList([wakeUp, { ...dentist, switchedOn: false }])

    await userEvent.click(screen.getByRole('switch', { name: 'Ring Wake up' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Ring Dentist' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit Dentist' }))

    expect(emitted('switchOff')).toEqual([[wakeUp]])
    expect(emitted('switchOn')).toEqual([[{ ...dentist, switchedOn: false }]])
    expect(emitted('edit')).toEqual([[{ ...dentist, switchedOn: false }]])
  })
})
