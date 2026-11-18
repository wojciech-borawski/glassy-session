import type { OverlaySettings } from '@/domain/overlay/model/overlay-settings'
import { isPinned as isSessionPinned, type FocusSession } from '@/domain/session/model/focus-session'
import { isPinned, type Timer } from '@/domain/timer/model/timer'
import { readOverlaySettings, watchOverlaySettings } from '@/infrastructure/browser/overlay-settings'
import { readStoredSessions, watchStoredSessions } from '@/infrastructure/browser/session-store'
import { readStoredTimers, watchStoredTimers } from '@/infrastructure/browser/timer-store'

type Shown = { timers: readonly Timer[], sessions: readonly FocusSession[], settings: OverlaySettings }

const isShown = ({ timers, sessions, settings }: Shown) => settings.shownOnPages && (timers.some(isPinned) || sessions.some(isSessionPinned))

/**
 * Calls the listener with whether the overlay shows on the page: something is pinned and the overlay is switched on.
 * It is called once the stored items are read, then each time the answer changes. Returns a function that stops following.
 */
export function followOverlayShown(listener: (shown: boolean) => void): () => void {
  let latest: Shown | null = null
  let changedWhileReading: Partial<Shown> = {}
  let told: boolean | null = null
  const change = (part: Partial<Shown>) => {
    if (latest === null) {
      changedWhileReading = { ...changedWhileReading, ...part }
      return
    }
    latest = { ...latest, ...part }
    const shown = isShown(latest)
    if (shown !== told) {
      told = shown
      listener(shown)
    }
  }
  const stops = [
    watchStoredTimers((timers) => change({ timers })),
    watchStoredSessions((sessions) => change({ sessions })),
    watchOverlaySettings((settings) => change({ settings }))
  ]
  let following = true
  void Promise.all([readStoredTimers(), readStoredSessions(), readOverlaySettings()]).then(([timers, sessions, settings]) => {
    if (following) {
      latest = { timers, sessions, settings }
      change(changedWhileReading)
    }
  })
  return () => {
    following = false
    stops.forEach((stop) => stop())
  }
}
