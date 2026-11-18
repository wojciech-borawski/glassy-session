import { createMemoryAlarmRinger } from '@/infrastructure/memory/alarm-ringer'
import { createMemoryAlarmStore } from '@/infrastructure/memory/alarm-store'
import { createMemoryWakeScheduler } from '@/infrastructure/memory/wake-scheduler'
import { createCommandQueue } from '../command/command-queue'
import { createAlarmEngine } from './alarm-engine'
import type { AlarmCommand } from './commands'
import { createAlarm, type Alarm, type AlarmDetails, type NewAlarm, type UtcOffsetAt } from './model/alarm'
import type { SavedAlarms } from './ports'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** A clock one hour ahead of UTC all year, so the tests do not depend on the machine's time zone. */
const oneHourAhead: UtcOffsetAt = () => HOUR

/** Tuesday 17 November 2026, 10:00 on a clock one hour ahead of UTC. */
const TUESDAY_TEN = Date.UTC(2026, 10, 17, 9)

/** Wednesday 18 November 2026, 07:00 on the same clock. */
const WEDNESDAY_SEVEN = Date.UTC(2026, 10, 18, 6)

const wakeUp: NewAlarm = { id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true }

function setup(saved?: SavedAlarms) {
  const alarmStore = createMemoryAlarmStore(saved)
  const wakeScheduler = createMemoryWakeScheduler()
  const ringer = createMemoryAlarmRinger()
  const startEngine = () => createAlarmEngine({ inTurn: createCommandQueue(), alarmStore, wakeScheduler, ringer, offsetAt: oneHourAhead })
  async function storedAlarms() {
    return (await alarmStore.load()).alarms
  }
  return { engine: startEngine(), engineAfterRestart: startEngine, storedAlarms, wakes: wakeScheduler.wakes, rang: ringer.rang, missed: ringer.missed }
}

describe('adding and changing alarms', () => {
  test('an added alarm is stored switched on, with a wake at its next ring', async () => {
    const { engine, storedAlarms, wakes } = setup()

    await engine.add(wakeUp, TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([createAlarm(wakeUp)])
    expect(wakes).toEqual(new Map([['alarm:wake-up', WEDNESDAY_SEVEN]]))
  })

  test('adding an alarm whose id is already stored changes nothing', async () => {
    const { engine, storedAlarms } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.add({ ...wakeUp, name: 'Get up' }, TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([createAlarm(wakeUp)])
  })

  test('a changed alarm is stored with its new details and its wake moves to its new next ring', async () => {
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.change('wake-up', { name: 'Get up', time: 6 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: false }, TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([{ ...createAlarm(wakeUp), name: 'Get up', time: 6 * HOUR + 30 * MINUTE, sendsNotification: false }])
    expect(wakes).toEqual(new Map([['alarm:wake-up', WEDNESDAY_SEVEN - 30 * MINUTE]]))
  })

  test('a removed alarm is no longer stored and its wake is cancelled', async () => {
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.remove('wake-up', TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([])
    expect(wakes).toEqual(new Map())
  })

  test.each<AlarmCommand>([
    { type: 'change', alarmId: 'gone', details: { name: 'Gone', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1] }, sendsNotification: true } },
    { type: 'remove', alarmId: 'gone' },
    { type: 'switchOn', alarmId: 'gone' },
    { type: 'switchOff', alarmId: 'gone' }
  ])('a $type command for an alarm that is no longer stored is refused as already removed and changes nothing', async (command) => {
    const { engine, storedAlarms } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    expect(await engine.run(command, TUESDAY_TEN)).toEqual({ reason: 'already removed' })
    expect(await storedAlarms()).toEqual([createAlarm(wakeUp)])
  })
})

describe('switching alarms on and off', () => {
  test('a switched off alarm is kept, and its wake is cancelled', async () => {
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.switchOff('wake-up', TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([{ ...createAlarm(wakeUp), switchedOn: false }])
    expect(wakes).toEqual(new Map())
  })

  test('an alarm switched on again gets its wake back at its next ring', async () => {
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)
    await engine.switchOff('wake-up', TUESDAY_TEN)

    await engine.switchOn('wake-up', TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([createAlarm(wakeUp)])
    expect(wakes).toEqual(new Map([['alarm:wake-up', WEDNESDAY_SEVEN]]))
  })

  test('switching on a one-time alarm whose moment has passed is refused, and it stays switched off', async () => {
    const dentist: NewAlarm = { id: 'dentist', name: 'Dentist', time: 8 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: true }
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(dentist, TUESDAY_TEN)
    await engine.switchOff('dentist', TUESDAY_TEN)

    expect(await engine.switchOn('dentist', TUESDAY_TEN)).toEqual({ reason: 'moment passed' })

    expect(await storedAlarms()).toEqual([{ ...createAlarm(dentist), switchedOn: false }])
    expect(wakes).toEqual(new Map())
  })

  test('changing the date of a used-up one-time alarm to a day to come switches it on again, with a wake at its new moment', async () => {
    const details: AlarmDetails = { name: 'Dentist', time: 9 * HOUR + 30 * MINUTE, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: true }
    const dentist: NewAlarm = { id: 'dentist', ...details }
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(dentist, Date.UTC(2026, 10, 17, 8))
    await engine.catchUp(TUESDAY_TEN)

    expect(await engine.change('dentist', { ...details, days: { kind: 'one-time', date: '2026-11-18' } }, TUESDAY_TEN)).toBeNull()

    expect(await storedAlarms()).toEqual([createAlarm({ ...dentist, days: { kind: 'one-time', date: '2026-11-18' } })])
    expect(wakes).toEqual(new Map([['alarm:dentist', Date.UTC(2026, 10, 18, 8, 30)]]))
  })

  test('renaming a used-up one-time alarm keeps it switched off', async () => {
    const details: AlarmDetails = { name: 'Dentist', time: 9 * HOUR + 30 * MINUTE, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: true }
    const dentist: NewAlarm = { id: 'dentist', ...details }
    const { engine, storedAlarms, wakes } = setup()
    await engine.add(dentist, Date.UTC(2026, 10, 17, 8))

    await engine.change('dentist', { ...details, name: 'Dentist at noon' }, TUESDAY_TEN)

    expect(await storedAlarms()).toEqual([{ ...createAlarm({ ...dentist, name: 'Dentist at noon' }), switchedOn: false }])
    expect(wakes).toEqual(new Map())
  })

  test('moving a one-time alarm that was switched off before its moment to a later day keeps it switched off', async () => {
    const details: AlarmDetails = { name: 'Dentist', time: 12 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: true }
    const dentist: NewAlarm = { id: 'dentist', ...details }
    const { engine, storedAlarms } = setup()
    await engine.add(dentist, TUESDAY_TEN)
    await engine.switchOff('dentist', TUESDAY_TEN)

    await engine.change('dentist', { ...details, days: { kind: 'one-time', date: '2026-11-18' } }, TUESDAY_TEN)

    expect((await storedAlarms())[0]?.switchedOn).toBe(false)
  })
})

describe('alarms ringing', () => {
  test('when its wake comes, an alarm rings once and its wake moves to its next ring', async () => {
    const { engine, rang, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.catchUp(WEDNESDAY_SEVEN + 1_000)
    await engine.catchUp(WEDNESDAY_SEVEN + 2_000)

    expect(rang).toEqual(['wake-up'])
    expect(wakes).toEqual(new Map([['alarm:wake-up', WEDNESDAY_SEVEN + 24 * HOUR]]))
  })

  test('a one-time alarm that rang is kept switched off, with no wake left', async () => {
    const { engine, storedAlarms, rang, wakes } = setup()
    const dentist: NewAlarm = { id: 'dentist', name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-17' }, sendsNotification: false }
    await engine.add(dentist, TUESDAY_TEN)

    await engine.catchUp(Date.UTC(2026, 10, 17, 14))

    expect(rang).toEqual(['dentist'])
    expect(await storedAlarms()).toEqual([{ ...createAlarm(dentist), switchedOn: false }])
    expect(wakes).toEqual(new Map())
  })
})

describe('missed alarms', () => {
  test('an alarm due while the browser could not ring is told as missed, at its latest ring, and nothing rings', async () => {
    const { engine, rang, missed, wakes } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)
    const fridayNoon = Date.UTC(2026, 10, 20, 11)

    await engine.catchUp(fridayNoon)

    expect(rang).toEqual([])
    expect(missed).toEqual([{ alarmId: 'wake-up', dueAt: Date.UTC(2026, 10, 20, 6) }])
    expect(wakes).toEqual(new Map([['alarm:wake-up', Date.UTC(2026, 10, 23, 6)]]))
  })

  test('after a restart, settling tells only what was missed since the moment stored as checked up to', async () => {
    const fridayNoon = Date.UTC(2026, 10, 20, 11)
    const { engine, engineAfterRestart, rang, missed } = setup({ alarms: [createAlarm(wakeUp)], checkedUpTo: fridayNoon })
    await engine.catchUp(Date.UTC(2026, 10, 24, 9))

    await engineAfterRestart().catchUp(Date.UTC(2026, 10, 24, 10))

    expect(rang).toEqual([])
    expect(missed).toEqual([{ alarmId: 'wake-up', dueAt: Date.UTC(2026, 10, 24, 6) }])
  })

  test('a command given after an alarm was missed tells it as missed before it changes anything', async () => {
    const { engine, missed, storedAlarms } = setup()
    await engine.add(wakeUp, TUESDAY_TEN)

    await engine.switchOff('wake-up', WEDNESDAY_SEVEN + HOUR)

    expect(missed).toEqual([{ alarmId: 'wake-up', dueAt: WEDNESDAY_SEVEN }])
    expect(await storedAlarms()).toEqual([{ ...createAlarm(wakeUp), switchedOn: false }])
  })
})

describe('running alarm commands', () => {
  const stored = createAlarm(wakeUp)
  const getUp = { name: 'Get up', time: 6 * HOUR, days: { kind: 'repeating', repeatDays: [6] }, sendsNotification: false } as const

  test.each([
    { command: { type: 'add', alarm: { ...wakeUp, id: 'second' } }, before: stored, after: [stored, { ...stored, id: 'second' }] },
    { command: { type: 'change', alarmId: 'wake-up', details: getUp }, before: stored, after: [{ ...stored, ...getUp }] },
    { command: { type: 'remove', alarmId: 'wake-up' }, before: stored, after: [] },
    { command: { type: 'switchOff', alarmId: 'wake-up' }, before: stored, after: [{ ...stored, switchedOn: false }] },
    { command: { type: 'switchOn', alarmId: 'wake-up' }, before: { ...stored, switchedOn: false }, after: [stored] }
  ] satisfies { command: AlarmCommand, before: Alarm, after: Alarm[] }[])('$command.type runs the use case it names', async ({ command, before, after }) => {
    const { engine, storedAlarms } = setup({ alarms: [before], checkedUpTo: TUESDAY_TEN })

    await engine.run(command, TUESDAY_TEN)

    expect(await storedAlarms()).toEqual(after)
  })
})
