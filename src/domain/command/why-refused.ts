import type { SoundUser } from '../sound/model/sound-use'
import type { Refusal } from './command-outcome'

/** Turns a message key and its values into text, as `t` from `useI18n()` does. */
export type Translate = (key: string, values: Record<string, unknown>) => string

const USER_KEYS = { 'timer': 'timer', 'alarm': 'alarm', 'playlist': 'playlist', 'end chime': 'endChime', 'start chime': 'startChime' } as const satisfies Record<SoundUser['kind'], string>

function userText(user: SoundUser, t: Translate): string {
  return t(`refusal.audioFileUser.${USER_KEYS[user.kind]}`, 'name' in user ? { name: user.name } : {})
}

/** The snackbar text that says why a command changed nothing. A new reason fails the type check until it has its text here. */
export function whyRefused(refusal: Refusal, t: Translate): string {
  switch (refusal.reason) {
  case 'task in use':
    return refusal.usedIn === null
      ? t('refusal.taskRunningOnItsOwn', { task: refusal.task.name })
      : t('refusal.taskInSession', { task: refusal.task.name, place: refusal.usedIn.name })
  case 'failed':
    return t('refusal.failed', { message: refusal.message })
  case 'already removed':
    return t('refusal.alreadyRemoved', {})
  case 'moment passed':
    return t('refusal.momentPassed', {})
  case 'not up next':
    return t('refusal.notUpNext', { number: refusal.step + 1, task: refusal.task.name })
  case 'run ended':
    return t('refusal.runEnded', {})
  case 'no time left':
    return t('refusal.noTimeLeft', { task: refusal.task.name })
  case 'not repeating today':
    return t('refusal.notRepeatingToday', { task: refusal.task.name })
  case 'audio file in use':
    return t('refusal.audioFileInUse', { users: new Intl.ListFormat('en', { type: 'conjunction' }).format(refusal.usedBy.map((user) => userText(user, t))) })
  default:
    return refusal satisfies never
  }
}
