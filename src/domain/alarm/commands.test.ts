import { isAlarmCommand } from './commands'

const HOUR = 3_600_000

const wakeUpDetails = { name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true }
const dentistDetails = { name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false }

describe('an alarm command', () => {
  test.each(['remove', 'switchOn', 'switchOff'])('%s for a stored alarm by its id is an alarm command', (type) => {
    expect(isAlarmCommand({ type, alarmId: 'wake-up' })).toBe(true)
  })

  test.each([
    ['a repeating alarm', { id: 'wake-up', ...wakeUpDetails }],
    ['a one-time alarm', { id: 'dentist', ...dentistDetails }]
  ])('adding %s is an alarm command', (_, alarm) => {
    expect(isAlarmCommand({ type: 'add', alarm })).toBe(true)
  })

  test('changing a stored alarm to new details is an alarm command', () => {
    expect(isAlarmCommand({ type: 'change', alarmId: 'wake-up', details: dentistDetails })).toBe(true)
  })

  test.each([
    ['nothing', undefined],
    ['a timer command', { type: 'remove', timerId: 'tea' }],
    ['a focus session command', { type: 'start', sessionId: 'morning' }],
    ['an unknown type', { type: 'snooze', alarmId: 'wake-up' }],
    ['a switch without an alarm id', { type: 'switchOn' }],
    ['an add without an alarm', { type: 'add' }],
    ['an add of an alarm without an id', { type: 'add', alarm: wakeUpDetails }],
    ['an add of an alarm whose time is text', { type: 'add', alarm: { id: 'wake-up', ...wakeUpDetails, time: '07:00' } }],
    ['an add of an alarm without a choice of notification', { type: 'add', alarm: { id: 'wake-up', ...wakeUpDetails, sendsNotification: undefined } }],
    ['an add of an alarm whose repeat days are text', { type: 'add', alarm: { id: 'wake-up', ...wakeUpDetails, days: { kind: 'repeating', repeatDays: ['monday'] } } }],
    ['an add of an alarm whose days are of an unknown kind', { type: 'add', alarm: { id: 'wake-up', ...wakeUpDetails, days: { kind: 'monthly', date: '2026-11-20' } } }],
    ['an add of a one-time alarm without a date', { type: 'add', alarm: { id: 'dentist', ...dentistDetails, days: { kind: 'one-time' } } }],
    ['a change without details', { type: 'change', alarmId: 'wake-up' }],
    ['a change to a ring sound this version cannot play', { type: 'change', alarmId: 'wake-up', details: { ...wakeUpDetails, ringSound: { kind: 'built-in', name: 'gong' } } }]
  ])('%s is not an alarm command', (_, message) => {
    expect(isAlarmCommand(message)).toBe(false)
  })
})
