import { isTimerCommand } from './commands'

describe('a timer command', () => {
  test('starting a stored timer by its id is a timer command', () => {
    expect(isTimerCommand({ type: 'start', timerId: 'tea' })).toBe(true)
  })

  test.each(['pin', 'unpin'])('%s for a stored timer by its id is a timer command', (type) => {
    expect(isTimerCommand({ type, timerId: 'tea' })).toBe(true)
  })

  test.each(['markDone', 'undoDone', 'skipToday'])('%s for a stored task by its id is a timer command', (type) => {
    expect(isTimerCommand({ type, timerId: 'write-report' })).toBe(true)
  })

  test.each([
    ['without a description', { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' } }],
    ['with a description', { id: 'write-report', name: 'Write report', description: 'For Monday', kind: 'task', plannedTime: 1_500_000, appearance: { colour: 'blue' } }]
  ])('adding a new timer %s is a timer command', (_, timer) => {
    expect(isTimerCommand({ type: 'add', timer })).toBe(true)
  })

  test.each([
    ['without a description', { name: 'Tea', plannedTime: 240_000, appearance: { colour: 'green' } }],
    ['with a description', { name: 'Tea', description: 'Black tea', plannedTime: 240_000, appearance: { colour: 'green' } }]
  ])('changing a stored timer %s is a timer command', (_, details) => {
    expect(isTimerCommand({ type: 'change', timerId: 'tea', details })).toBe(true)
  })

  test.each([
    ['nothing', undefined],
    ['a string', 'start'],
    ['an unknown type', { type: 'explode', timerId: 'tea' }],
    ['a start without a timer id', { type: 'start' }],
    ['a pause with a timer id that is not text', { type: 'pause', timerId: 3 }],
    ['an add without a timer', { type: 'add' }],
    ['an add of a timer without an id', { type: 'add', timer: { name: 'Tea', kind: 'timer', plannedTime: 180_000 } }],
    ['an add of a timer without a name', { type: 'add', timer: { id: 'tea', kind: 'timer', plannedTime: 180_000 } }],
    ['an add of a timer of an unknown kind', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'alarm', plannedTime: 180_000 } }],
    ['an add of a timer whose planned time is not a number', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: '3 minutes' } }],
    ['an add of a timer whose description is not text', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, description: 7, appearance: { colour: 'teal' } } }],
    ['an add of a timer without an appearance', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000 } }],
    ['a change without details', { type: 'change', timerId: 'tea' }],
    ['a change without a timer id', { type: 'change', details: { name: 'Tea', plannedTime: 240_000, appearance: { colour: 'green' } } }],
    ['a change to a colour the kit cannot draw', { type: 'change', timerId: 'tea', details: { name: 'Tea', plannedTime: 240_000, appearance: { colour: 'chartreuse' } } }],
    ['a change whose planned time is not a number', { type: 'change', timerId: 'tea', details: { name: 'Tea', plannedTime: '4 minutes', appearance: { colour: 'green' } } }],
    ['an add of a timer in a colour the kit cannot draw', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'chartreuse' } } }],
    ['a change whose repeat days are not a list', { type: 'change', timerId: 'read', details: { name: 'Read', plannedTime: 240_000, appearance: { colour: 'green' }, repeatDays: 'Monday' } }],
    ['a change with a repeat day that is not a day of the week', { type: 'change', timerId: 'read', details: { name: 'Read', plannedTime: 240_000, appearance: { colour: 'green' }, repeatDays: [1, 7] } }],
    ['a change whose pin is not true or false', { type: 'change', timerId: 'tea', details: { name: 'Tea', plannedTime: 240_000, appearance: { colour: 'green' }, pinned: 'yes' } }],
    ['a change to a ring sound this version cannot play', { type: 'change', timerId: 'tea', details: { name: 'Tea', plannedTime: 240_000, appearance: { colour: 'green' }, ringSound: { kind: 'built-in', name: 'gong' } } }],
    ['an add of a timer whose ring sound is an audio file without an id', { type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' }, ringSound: { kind: 'audio file' } } }],
    ['an add of a task with a repeat day that is not a whole number', { type: 'add', timer: { id: 'read', name: 'Read', kind: 'task', plannedTime: 240_000, appearance: { colour: 'green' }, repeatDays: [1.5] } }]
  ])('%s is not a timer command', (_, message) => {
    expect(isTimerCommand(message)).toBe(false)
  })
})
