import { isSessionCommand } from './commands'

const settings = { name: 'Morning', taskIds: ['write-report'], stepLength: 1_500_000, breakLength: 300_000, order: 'one after another' }

const morning = { id: 'morning', ...settings }

describe('a focus session command', () => {
  test.each([
    ['adding a new session', { type: 'add', session: morning }],
    ['changing a stored session\'s settings', { type: 'change', sessionId: 'morning', settings }],
    ...(['remove', 'start', 'pause', 'resume', 'skip', 'endEarly', 'pin', 'unpin'] as const).map((type): [string, unknown] => [`${type} by the session's id`, { type, sessionId: 'morning' }]),
    ['moving a step', { type: 'moveStep', sessionId: 'morning', from: 2, to: 0 }],
    ['sending a step to the front', { type: 'sendToFront', sessionId: 'morning', step: 2 }],
    ['adding a task\'s steps', { type: 'addTaskSteps', sessionId: 'morning', taskId: 'answer-email' }],
    ['marking a task of the run done', { type: 'markTaskDone', sessionId: 'morning', taskId: 'answer-email' }]
  ])('%s is a focus session command', (_, message) => {
    expect(isSessionCommand(message)).toBe(true)
  })

  test.each([
    ['nothing', undefined],
    ['a timer command', { type: 'start', timerId: 'tea' }],
    ['an unknown type', { type: 'explode', sessionId: 'morning' }],
    ['a start without a session id', { type: 'start' }],
    ['an add of a session without a name', { type: 'add', session: { ...morning, name: undefined } }],
    ['an add of a session whose tasks are not all text', { type: 'add', session: { ...morning, taskIds: ['write-report', 7] } }],
    ['an add of a session whose tasks are not a list', { type: 'add', session: { ...morning, taskIds: 'write-report' } }],
    ['an add of a session in an unknown order', { type: 'add', session: { ...morning, order: 'shuffled' } }],
    ['an add of a session whose break length is not a number', { type: 'add', session: { ...morning, breakLength: '5 minutes' } }],
    ['a change without settings', { type: 'change', sessionId: 'morning' }],
    ['a change whose step length is not a number', { type: 'change', sessionId: 'morning', settings: { ...settings, stepLength: null } }],
    ['a change whose pin is not true or false', { type: 'change', sessionId: 'morning', settings: { ...settings, pinned: 1 } }],
    ['a step move without where to', { type: 'moveStep', sessionId: 'morning', from: 2 }],
    ['a send to the front without a step', { type: 'sendToFront', sessionId: 'morning' }],
    ['adding the steps of a task without its id', { type: 'addTaskSteps', sessionId: 'morning' }],
    ['marking a task done without its id', { type: 'markTaskDone', sessionId: 'morning', taskId: 7 }]
  ])('%s is not a focus session command', (_, message) => {
    expect(isSessionCommand(message)).toBe(false)
  })
})
