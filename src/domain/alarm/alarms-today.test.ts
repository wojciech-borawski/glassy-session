import { render, screen, within } from '@testing-library/vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import AlarmsToday from './alarms-today.vue'
import { createAlarm, type Alarm } from './model/alarm'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Tuesday 17 November 2026, 09:00 on the local clock. */
const TUESDAY_NINE = new Date(2026, 10, 17, 9).getTime()

const workdays = { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] } as const
const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: workdays, sendsNotification: true })
const lunch = createAlarm({ id: 'lunch', name: 'Lunch', time: 13 * HOUR, days: workdays, sendsNotification: true })
const standUp = createAlarm({ id: 'stand-up', name: 'Stand-up', time: 9 * HOUR + 45 * MINUTE, days: workdays, sendsNotification: false })

function renderToday(alarms: readonly Alarm[], now = TUESDAY_NINE) {
  return render(AlarmsToday, { props: { alarms, now }, global: { plugins: [createAppI18n()] } })
}

describe('the alarms left today', () => {
  test('lists the alarms still to ring today with their time, the soonest first', () => {
    renderToday([lunch, wakeUp, standUp])

    const items = within(screen.getByRole('region', { name: 'Alarms today' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['09:45 Stand-up', '13:00 Lunch'])
  })

  test('is not shown when no alarm is left to ring today', () => {
    renderToday([wakeUp, lunch], new Date(2026, 10, 17, 14).getTime())

    expect(screen.queryByRole('region', { name: 'Alarms today' })).not.toBeInTheDocument()
  })
})
