/**
 * The text of the system notifications the background shows, kept apart from the locale messages so the background needs no vue-i18n.
 * A `{name}` in a text is filled in with the value of that name.
 */
export const notificationTexts = {
  'ring.finished': 'Its time has run out.',
  'chime.focusStepEnded': 'A focus step has ended.',
  'chime.breakEnded': 'The break has ended.',
  'chime.sessionEnded': 'The focus session has ended.',
  'alarmRing.due': 'It is {time}.',
  'alarmRing.missed': 'Missed: it was due at {time} on {day}.'
} as const

export type NotificationKey = keyof typeof notificationTexts

/** The text of the key with each `{name}` filled in. A name without a value stays as it is written. */
export function notificationText(key: NotificationKey, values: Readonly<Record<string, string>> = {}): string {
  return notificationTexts[key].replace(/\{(\w+)\}/g, (written, name: string) => values[name] ?? written)
}
