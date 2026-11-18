import type { ToolbarButton } from '@/domain/command/ports'
import type { ToolbarBadge } from '@/domain/command/toolbar-badge'

/**
 * The badge's background for each look, under white text: a warm orange while a timer or a focus step runs, a calmer green while every
 * one that runs is on a break. Both keep white text above 5:1 and stand apart from the blue icon on light and dark toolbars.
 */
const BADGE_COLOURS: Readonly<Record<ToolbarBadge['look'], string>> = {
  running: '#C2410C',
  'on break': '#15803D'
}

const BADGE_TEXT_COLOUR = '#FFFFFF'

/** What the badge needs of the toolbar button's API. */
type BadgeApi = Readonly<{
  setBadgeText(details: Readonly<{ text: string }>): Promise<void>
  setBadgeBackgroundColor(details: Readonly<{ color: string }>): Promise<void>
  setBadgeTextColor(details: Readonly<{ color: string }>): Promise<void>
}>

/**
 * Manifest V3 has `action`. The Manifest V2 build for Firefox has only `browserAction`, which there returns promises and has
 * `setBadgeTextColor` too, though the Chrome types WXT gives it say neither.
 */
function badgeApi(): BadgeApi {
  return (browser.action ?? browser.browserAction) as BadgeApi
}

/** The toolbar button of the extension's own browser. A badge the browser refuses to show goes to the console instead. */
export function createBrowserToolbarButton(): ToolbarButton {
  return {
    async showBadge(badge) {
      try {
        const api = badgeApi()
        await api.setBadgeText({ text: badge?.text ?? '' })
        if (badge !== null) {
          await api.setBadgeBackgroundColor({ color: BADGE_COLOURS[badge.look] })
          await api.setBadgeTextColor({ color: BADGE_TEXT_COLOUR })
        }
      } catch (error) {
        console.error(error)
      }
    }
  }
}
