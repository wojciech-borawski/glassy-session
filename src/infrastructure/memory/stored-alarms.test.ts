import { createAlarm } from '@/domain/alarm/model/alarm'
import { createMemoryStoredAlarms } from './stored-alarms'

const HOUR = 3_600_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const wakeUp = { id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true } as const

describe('the stored alarms kept in memory', () => {
  test('a command runs on the alarm engine and the alarms follow what it saved', async () => {
    const stored = createMemoryStoredAlarms({ now: () => NINE })

    const refusal = await stored.send({ type: 'add', alarm: wakeUp })

    expect(refusal).toBeNull()
    expect(stored.alarms.value).toEqual([createAlarm(wakeUp)])
  })

  test('starts with the alarms it is given, and a command that fails resolves as a failure that leaves them as they were', async () => {
    const stored = createMemoryStoredAlarms({ now: () => NINE, alarms: [createAlarm(wakeUp)] })

    const refusal = await stored.send({ type: 'change', alarmId: 'wake-up', details: { ...wakeUp, name: '' } })

    expect(refusal).toEqual({ reason: 'failed', message: 'An alarm needs a name' })
    expect(stored.alarms.value).toEqual([createAlarm(wakeUp)])
  })
})
