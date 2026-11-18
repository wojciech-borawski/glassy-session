import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { Refusal } from './command-outcome'
import { whyRefused } from './why-refused'

const { t } = createAppI18n().global

describe('the snackbar text that says why a command changed nothing', () => {
  test.each([
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } }, says: 'Write report is in Morning' },
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: null }, says: 'Write report is already running on its own' },
    { refusal: { reason: 'failed', message: 'Storage is full' }, says: 'That did not work: Storage is full' },
    { refusal: { reason: 'already removed' }, says: 'It was already removed' },
    { refusal: { reason: 'not up next', task: { id: 'write-report', name: 'Write report' }, step: 1 }, says: 'Step 2, Write report, is no longer up next' },
    { refusal: { reason: 'run ended' }, says: 'The run has ended' },
    { refusal: { reason: 'no time left', task: { id: 'answer-email', name: 'Answer email' } }, says: 'Answer email has no time left' },
    { refusal: { reason: 'not repeating today', task: { id: 'write-report', name: 'Write report' } }, says: 'Write report does not repeat today, so there is nothing to skip' },
    { refusal: { reason: 'audio file in use', usedBy: [{ kind: 'timer', name: 'Tea' }, { kind: 'end chime' }, { kind: 'playlist', name: 'Focus mix' }] }, says: 'It is still played by the timer Tea, the end chime, and the playlist Focus mix' },
    { refusal: { reason: 'audio file in use', usedBy: [{ kind: 'alarm', name: 'Wake up' }] }, says: 'It is still played by the alarm Wake up' }
  ] satisfies { refusal: Refusal, says: string }[])('$says', ({ refusal, says }) => {
    expect(whyRefused(refusal, t)).toBe(says)
  })
})
