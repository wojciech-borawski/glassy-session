import { notificationText, type NotificationKey } from './notification-texts'

/** The extension's own icon, from `public/icon`. */
const ICON_PATH = '/icon/128.png'

type NotifyOptions = Readonly<{
  /** The named values the text is filled in with. Defaults to none. */
  values?: Readonly<Record<string, string>>
  /** Asks the system to make no sound. Firefox is not asked, because its notification options have no such field. Defaults to false. */
  quiet?: boolean
}>

/**
 * Shows a system notification with the title and the text of the key, looked up without vue-i18n so the background bundle carries none. A notification with the same id replaces the one before it.
 * One the system refuses goes to the console instead, so the ring or chime it belongs to still sounds and its command still ends as it went.
 */
export async function notify(id: string, title: string, messageKey: NotificationKey, { values = {}, quiet = false }: NotifyOptions = {}): Promise<void> {
  const silence = quiet && import.meta.env.BROWSER !== 'firefox' ? { silent: true } : {}
  try {
    await browser.notifications.create(id, { type: 'basic', iconUrl: browser.runtime.getURL(ICON_PATH), title, message: notificationText(messageKey, values), ...silence })
  } catch (error) {
    console.error(error)
  }
}
