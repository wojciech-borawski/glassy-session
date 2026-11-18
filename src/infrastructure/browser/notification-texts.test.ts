import { notificationText } from './notification-texts'

describe('the text of a system notification', () => {
  test('is the text of its key with each named value filled in', () => {
    expect(notificationText('alarmRing.missed', { time: '07:30', day: 'Tuesday, November 24' })).toBe('Missed: it was due at 07:30 on Tuesday, November 24.')
  })

  test('keeps a name it has no value for as it is written', () => {
    expect(notificationText('alarmRing.due')).toBe('It is {time}.')
  })
})
